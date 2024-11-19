# Service Log monitor - monitor log of any service for defined patterns

This utility script monitors each log line of a specified service in real time and checks it for occurancy of defined pattern based on which it may process defined actions

## Supported patters
- log line contains certain string (e.g. `Error: PublishError.NoPeersSubscribedToTopic`). This feature is activated by attaching `-f TargetFile`.
- new log line was not returned for a specified time (this may indicate stucked client). As a shell does not allow parallel execution, this will be done through an extra shell script.  This feature is activated by attaching `-t MaxSecondsPeriode`

## Utility structure
Utility consists of scripts, definition file and service files for running the utility on the background
### Scripts
- `logmonitor.sh` monitors logs based on specified parameters
- `logmonitor_executor.sh` [optional] executes actions based on pattern found by `logmonitor.sh`. It's attached as a parameter of `logmonitor.sh` and can be individual for any service.
### Definition file
- `.txt` file that defined patterns to search in the logs. It's attached as a parameter of `logmonitor.sh` and can be individual for any service.
### Service file
- `.service` file for running `logmonitor.sh` on background.

### Supported arguments
```
├── -s|--service_name:   name of the targeted service for log monitoring
├── -x|--executor_shell: absolute path to shell script executing actions
├── -t|--log_maxwaitingtime: [seconds] Maximum enabled time between 2 printed logs by the tracked service. If no log displayed, an action is processed through executor_shell
├── -f|--targets_file:   absolute path to the file with a list of occurrences to check in a log
├── -d|--executor_trigger_periode: [seconds] | interval within which trigger_count for the key defined in the target file must occur (e.g. 60 occurances in 60 seconds)
├── -p|--executor_trigger_pause [seconds] | delay time after execution - time for service estabilishment
├── -b|--service_data | directory path to the service data
├── -c|--peers_tracking | enable peers tracking [0/1]. Peers count is kept in /tmp/beacon_peers.txt and is used by other utils, such as [Node state snapshots](https://github.com/Stakers-space/staking-scripts/tree/main/monitor/node_state_snapshots)
└── -m|--peers_mincount | Minimum number of peers, below the count a warning is printed
```

## Installation
- Check the `logmonitor.sh` version installed on the server
```
/usr/local/bin/logmonitor.sh version
```
If there is no or old version installed, install the latest one
- Check the `logmonitor.sh` script
```
curl -H "Cache-Control: no-cache" -o- https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/monitor/service_log/logmonitor.sh
```
- Download the script to `/usr/local/bin` directory
```
sudo curl -o /usr/local/bin/logmonitor.sh https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/monitor/service_log/logmonitor.sh
```
- Enable execution of the shell script
```
sudo chmod +x /usr/local/bin/logmonitor.sh
```

## Launching Log Monitor
The utility allows to monitor individual as well as all supported patterns. The configurtion is set throug attached parameters

### Monitoring whether a newly printed log line contains a certain string
- Create a new definition .txt file. Use name referring to the service you are going to monitor, e.g. `lodestarbeaconlog_patterns.txt`
```
sudo nano /usr/local/etc/lodestarbeaconlog_patterns.txt
```
- Define strings the utility should search for within each log line in the following format:
```
occurancyKey@triggerCount@occurancyString
```
Where:
 - `occurancyKey` = categorization. e.g. `network`, `client` etc. You can set own custom value. You can have 1 `occurancyKey` for each line as well as use same `occurancyKey` for numerous lines. In such case, more occurances are counted under one `occurancyKey`.
 - `@` = parser
 - `triggerCount` = trigger count (within specified time through `-d|--executor_trigger_periode` param) for executing an action
 - `@` = parser
 - `occurancyString` = string the utility should search for in each line, e.g. `Error: PublishError.NoPeersSubscribedToTopic`
    `/usr/local/etc/lodestarbeaconlog_patterns.txt` content Sample:
 ```
    NETWORK@100@Error: Connect ECONNREFUSED
    NETWORK@50@Error: Timeout
    NETWORK_INVALIDREQUEST@100@Error: RESPONSE_ERROR_INVALID_REQUEST: stream reset
    NETWORK_UnexpectedEnd@100@Error: unexpected end of input
    NETWORK_ErrorDial@100@Error: REQUEST_ERROR_DIAL_ERROR
    NETWORK_RATELIMIT@100@Error: Request_Error_RATE_LIMITED
    NETWORK_MaxPeerAddr@100@CodeError: Peer had more than maxPeerAddrsToDial
    NETWORK_MulltiaddrAggr@100@AggregateCodeError: All multiaddr dials failed
    NETWORK_InconsistentState@100@Error: Inconsistent state, blobSidecar blockRoot=
    PUBLISH_NoPeers@100@Error: PublishError.NoPeersSubscribedToTopic
    PUBLISH_NoPeers@100@Error: Multiple errors on submitPoolSyncCommitteeSignatures
```
Alternatively, you can find ready-to use pattern file for the specified client, see:
 - [Nethermind Log Monitor](https://github.com/Stakers-space/staking-scripts/blob/main/nethermind/log_monitor/nethermind_tracking_records.txt)
 - [Lighthouse Beacon Log Monitor](https://github.com/Stakers-space/staking-scripts/blob/main/lighthouse/beacon_log_monitor/lighthousebeacon_tracking_records.txt)
 - [Lodestar Beacon Log Monitor](https://github.com/Stakers-space/staking-scripts/blob/main/lodestar/validator_log_monitor/lodestarvalidator_tracking_records.txt)
 - [Teku Beacon Log Monitor](https://github.com/Stakers-space/staking-scripts/blob/main/teku/beacon_log_monitor/tekubeacon_tracking_records.txt)

- Launch the shell script
```
/usr/local/bin/logmonitor.sh --service_name "serviceName" --targets="definition_file"
```
Sample:
```
/usr/local/bin/logmonitor.sh --service_name "lodestarBeacon.service" --targets="/usr/local/etc/lodestarbeaconlog_patterns.txt"
```
The script prints warning if any specified patter is found in the log. It also may process any execution action through `logmonitor_executor.sh` (see running executer section).

### Monitoring time from previous printed log
`logmonitor.sh` includes a simple timer utility that triggers an action if no log line was printed within a defined time. It's automatically activated by attaching parameter `--log_maxwaitingtime` defining maximum enabled time without any new log line. After activation, the `.logmonitor.sh` prints a warning by deafault. It `.logmonitor.sh` is connected with `logmonitor_executor.sh`, an action defined under key `nolog` is being triggered through the `logmonitor_executor.sh`. (Typical action is restarting the client).
Sample:
```
/usr/local/bin/logmonitor.sh --service_name "serviceName" --log_maxwaitingtime="500"
```

### Monitoring both at once
```
/usr/local/bin/logmonitor.sh --service_name "serviceName" --targets_file="definition_file" --log_maxwaitingtime="MaxnabledTimeFromPreviousLogLine"
```
Sample:
```
/usr/local/bin/logmonitor.sh --service_name "lodestarBeacon.service" --targets_file="/usr/local/etc/lodestarbeaconlog_patterns.txt" --log_maxwaitingtime="500"
```

## Running executor
Executor utility allows to execute any acction when certain pattern is reached (e.g. certain string found in a log for 50 times in a minute). Executor script is separated from `log_monitor`, as it's an optional extension of the `log_monitor` itself.

`logmonitor_executor.sh` is attached to `log_monitor` utility as a parameter and as so it may be individual for each service. Do not hesitate to rename its default name `logmonitor_executor.sh` for your custom client-based related name.
- Check the `logmonitor_executor.sh` script
```
curl -o- https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/monitor/service_log/logmonitor_executor.sh
```
- Download the script to `/usr/local/bin` directory
```
sudo curl -o /usr/local/bin/logmonitor_executor.sh https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/monitor/service_log/logmonitor_executor.sh
```
- Open the file and configurate execution actions
```
sudo nano /usr/local/bin/logmonitor_executor.sh
```
- Enable execution of the shell script
```
sudo chmod +x /usr/local/bin/logmonitor_executor.sh
```
- Activate executor with adding executor-related arguments on launching `/usr/local/bin/logmonitor.sh`.
```
/usr/local/bin/logmonitor.sh --service_name "serviceName" --targets="definition_file" --executer_trigger_pause="MaxnabledTimeFromPreviousLogLine" ...
```
Sample:
```
/usr/local/bin/logmonitor.sh --service_name "lodestarBeacon.service" --targets="/usr/local/etc/lodestarbeaconlog_patterns.txt" --executer_trigger_pause="500" ...
```

> [!NOTE]  
> If you use `sudo` commands within the executor, be sure you enabled that for the service user, see
> - Open suborders file
> ```
> sudo visudo
> ```
> - Enable sudo execution of `/usr/local/bin/sampleService` by `specificServiceUser` through adding following line at the end
> ```
> specificServiceUser ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart sampleService
> ```

## Service files configuration
Configurate serivce file and run the logmonitor under a service on background.
### Execution Clients:
- [Nethermind Log Monitor](https://github.com/Stakers-space/staking-scripts/tree/main/nethermind/log_monitor)
### Consensus Clients
- [Lodestar Beacon Log Monitor](https://github.com/Stakers-space/staking-scripts/tree/main/lodestar/beacon_log_monitor)
- [Teku Beacon Log Monitor](https://github.com/Stakers-space/staking-scripts/tree/main/teku/beacon_log_monitor)
### Validator Clients
- [Lodestar Validator Log Monitor](https://github.com/Stakers-space/staking-scripts/tree/main/lodestar/validator_log_monitor)