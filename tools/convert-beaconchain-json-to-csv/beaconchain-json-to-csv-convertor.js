'use strict';

const fs = require('fs');
const path = require('path');

class BeaconchaInJsonToCsvConvertor {
    constructor(){
        this.rewardFiles = this.getJsonRewardsFilesNames();
        this.rewardsByTime = {};

        for (const fileName of this.rewardFiles) {
            this.loadAndProcessJsonRewardsFile(fileName, path.join(__dirname, fileName));
        }

        this.generateRewardSum();

        //console.log(this.rewardsByTime);
        this.generateCsv();

    }

    getJsonRewardsFilesNames(){
        return fs.readdirSync(__dirname).filter(file => file.endsWith('.json'));
    }

    loadAndProcessJsonRewardsFile(fileName, fileAbsolutePath){
        const content = fs.readFileSync(fileAbsolutePath, 'utf8');
        const valIdent = this.getValidatorIdentification(fileName);
        const valData = JSON.parse(content);

        const rewardKeys = Object.keys(valData);
        //console.log(rewardKeys);
        for(const key of rewardKeys){
            for(const d of valData[key]){
                const timeMs = d.x;
                if(!this.rewardsByTime[timeMs]) this.rewardsByTime[timeMs] = {};
                if(!this.rewardsByTime[timeMs][valIdent])  this.rewardsByTime[timeMs][valIdent] = {};
                this.rewardsByTime[timeMs][valIdent][key] = d.y;
            }
        }
    }

    generateRewardSum(){
        for (const [timeMs, data] of Object.entries(this.rewardsByTime)) {
            this.rewardsByTime[timeMs].sum = 0;
            for (const [valIdent, valRewards] of Object.entries(data)) {
                if(valIdent === 'sum') continue;
                this.rewardsByTime[timeMs][valIdent].sum = 0;
                for (const [rewardType, rewardValue] of Object.entries(valRewards)) {
                    this.rewardsByTime[timeMs][valIdent].sum += rewardValue;
                }
                this.rewardsByTime[timeMs].sum += this.rewardsByTime[timeMs][valIdent].sum;
            } 
        }
    }

    getValidatorIdentification(fileName){
        return fileName.split(".")[0];
    }

    generateCsv(){
        const valIdentsOrderArrIndex = {};
        const rewardsTypeArrIndex = {
            'executionChartData': 0,
            'consensusChartData': 1,
            'sum': 2
        };
        const arrLength = this.rewardFiles.length * 3 + 3;

        const rows = [];

        // header
        let header1 = ['', ''];
        let header2 = ['timeMs', 'date'];
        // attach validator ids
        let ordIndex = 0;
        for (const fileName of this.rewardFiles) {
            const valIdent = this.getValidatorIdentification(fileName);
            valIdentsOrderArrIndex[valIdent] = ordIndex++;

            header1.push('', valIdent, '');
            for(const k of Object.keys(rewardsTypeArrIndex)){
                header2.push(k);
            }
        }
        //console.log(valIdentsOrderArrIndex);
        header1.push('');
        header2.push('sum');
        rows.push(header1, header2);

        // data
        //console.log(this.rewardsByTime);
        for (const [timeMs, data] of Object.entries(this.rewardsByTime)) {
            const lineWrapper = new Array(arrLength).fill(0);
            lineWrapper[0] = timeMs;
            lineWrapper[1] = new Date(Number(timeMs));
            lineWrapper[arrLength-1] = data['sum'];
            for (const [valIdent, valRewards] of Object.entries(data)) {
                if(valIdent === 'sum') continue;
                
                const validatorIndex = valIdentsOrderArrIndex[valIdent];
                for (const [rewardType, rewardValue] of Object.entries(valRewards)) {
                    const rewardIndex = rewardsTypeArrIndex[rewardType];
                    const arrRevIndex = 2+(validatorIndex * 3)+rewardIndex;
                    //console.log(`val ${valIdent} (${validatorIndex}) | ${rewardType} (${rewardIndex}) → ${arrRevIndex}`);
                    lineWrapper[arrRevIndex] = rewardValue;
                }
            }
            //console.log(lineWrapper);
            rows.push(lineWrapper);
        }

        //console.log(rows);

        const csvContent = rows.map(row => row.join(',')).join('\n');
        const filePath = path.join(__dirname, 'output.csv');

        fs.writeFileSync(filePath, csvContent, 'utf8');

        console.log(`CSV saved to: ${filePath}`);
    }
}

new BeaconchaInJsonToCsvConvertor();