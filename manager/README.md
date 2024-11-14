# Staking.sh shell script for clients management
`staking.sh` script allows control basic actions related to staking clients in a simple way.


### Check version of the script installed on the node
```
/usr/local/bin/staking.sh version
```

### Installation
1. Check the script
```
curl -o- https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/manager/staking.sh
```
2. Download the script
```
sudo curl -o /usr/local/bin/staking.sh https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/manager/staking.sh
```
3. Enable execution of the shell script
```
sudo chmod +x /usr/local/bin/staking.sh
```
4. In a case of first use, generate config files
```
sudo /usr/local/bin/staking.sh init
```
- This command will create `clients.conf` and `styling.conf` file at `/usr/local/etc`

5. Modify `/usr/local/etc/staking/config/clients.conf` file
```
sudo nano /usr/local/etc/staking/config/clients.conf
```
Modify the default content of your `clients.conf` for setting proper services names (allows you to use aliases instead of real service names)

## Use the script
- View all options
```/usr/local/bin/staking.sh help```
- Check status of all clients: 
```
/usr/local/bin/staking.sh check
```
- beside `check`, you can use equivalent `status` option
>   You can also specify certain client:
>    - through alias: 
>        - `/usr/local/bin/staking.sh check execution`
>        - `/usr/local/bin/staking.sh check beacon`
>        - `/usr/local/bin/staking.sh check validators`
>        - `/usr/local/bin/staking.sh check consensus` (= beacon + validators)
>    - through real service name: 
>        - `/usr/local/bin/staking.sh check lighthousebeacon`
- Monitor all clients log: `/usr/local/bin/staking.sh monitor`
    > You can also specify certain client:
    > - through alias: 
    >    - `/usr/local/bin/staking.sh monitor execution`
    >    - `/usr/local/bin/staking.sh monitor beacon`
    >    - `/usr/local/bin/staking.sh monitor validators`
    >    - `/usr/local/bin/staking.sh monitor consensus` (= beacon + validators)
    > - through real service name:
    >     `/usr/local/bin/staking.sh monitor lighthousebeacon`
- Start all clients: `/usr/local/bin/staking.sh start all`
    > You can also specify certain client:
    > - through alias:
    >   - `/usr/local/bin/staking.sh start execution`
    >   - `/usr/local/bin/staking.sh start beacon`
    >   - `/usr/local/bin/staking.sh start validators`
    >   - `/usr/local/bin/staking.sh start consensus` (= beacon + validators)
    > - through real service name:
    >    `/usr/local/bin/staking.sh start lighthousebeacon`
- Stop all clients: `/usr/local/bin/staking.sh stop all`
    > You can also specify certain client:
    > - through alias:
    >   - `/usr/local/bin/staking.sh stop execution`
    >   - `/usr/local/bin/staking.sh stop beacon`
    >   - `/usr/local/bin/staking.sh stop validators`
    >   - `/usr/local/bin/staking.sh stop consensus` (= beacon + validators)
    > - through real service name: `/usr/local/bin/staking.sh stop lighthousebeacon`
- Restart all clients: `/usr/local/bin/staking.sh restart all`
    > You can also specify certain client:
    > - through alias:
    >   - `/usr/local/bin/staking.sh restart execution`
    >   - `/usr/local/bin/staking.sh restart beacon`
    >   - `/usr/local/bin/staking.sh restart validators`
    >   - `/usr/local/bin/staking.sh restart consensus` (= beacon + validators)
    > - through real service name: `/usr/local/bin/staking.sh restart lighthousebeacon`
- Get version: `/usr/local/bin/staking.sh version`
- Print config : `/usr/local/bin/staking.sh config`