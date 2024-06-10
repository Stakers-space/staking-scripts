# Log monitor and execution service

This utility script monitors each log line of a specified service in real time and checks it for occurancy of defined pattern based on which it may process defined actions

## Supported patters
- log line contains certain string (e.g. `Error: PublishError.NoPeersSubscribedToTopic`)
- new log line was not returned for a specified time (this may indicate stucked client). As a shell does not allow parallel execution, this will be done through an extra shell script

## utility structure
Utility consists of scripts, definition file and service files for running the utility on the background
### Scripts
- `logmonitor.sh` monitor logs based on specified parameters
- `logmonitor_executor.sh` [optional] is used by `logmonitor.sh` to execute actions. It's attached as a parameter of `logmonitor.sh` and can be individual for any service.
### Definition file
- `.txt` file that defined patterns to search in the logs. It's attached as a parameter of `logmonitor.sh` and can be individual for any service.
### Service file
- `.service` file for running `logmonitor.sh` on background.

### Supported arguments
```
├── service_name:       this service log is being tracked"
├── targets_file:       [file] list of occurrences for which the log is checked"
├── log_maxwaitingtime: [seconds] Maximum enabled time between 2 printed logs by the tracked service"
└── executor_shell:     shell executing actions once the trigger is reached [if no filled, no action is applied]"
    ├── trigger:        [int] required number of occurances to execute a given action"
    ├── periode:        [seconds] | interval in which @trigger is automatically reseted to 0"
    └── delay:          [seconds] | delay time after execution- time for servicrs estabilishment before continuing in the script"
```

## Installation
- Check the `logmonitor.sh` script
```
curl -H "Cache-Control: no-cache" -o- https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/log_monitor/logmonitor.sh
```
- Download the script to `/usr/local/bin` directory
```
sudo curl -o /usr/local/logmonitor.sh https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/log_monitor/logmonitor.sh
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
occurancyKey@occurancyString
```
Where:
    - `occurancyKey` = categorization. e.g. `network`, `client` etc. You can set own custom value. You can have 1 `occurancyKey` for each line as well as use same `occurancyKey` for numerous lines. In such case, more occurances are counted under one `occurancyKey`.
    - `@` = parser
    - `occurancyString` = string the utility should search for in each line, e.g. `Error: PublishError.NoPeersSubscribedToTopic`
    `/usr/local/etc/lodestarbeaconlog_patterns.txt` content Sample:
    ```
    NETWORK@Error: Connect ECONNREFUSED
    NETWORK@Error: Timeout
    NETWORK_INVALIDREQUEST@Error: RESPONSE_ERROR_INVALID_REQUEST: stream reset
    NETWORK_UnexpectedEnd@Error: unexpected end of input
    NETWORK_ErrorDial@Error: REQUEST_ERROR_DIAL_ERROR
    NETWORK_RATELIMIT@Error: Request_Error_RATE_LIMITED
    NETWORK_MaxPeerAddr@CodeError: Peer had more than maxPeerAddrsToDial
    NETWORK_MulltiaddrAggr@AggregateCodeError: All multiaddr dials failed
    NETWORK_InconsistentState@Error: Inconsistent state, blobSidecar blockRoot=
    PUBLISH_NoPeers@Error: PublishError.NoPeersSubscribedToTopic
    PUBLISH_NoPeers@Error: Multiple errors on submitPoolSyncCommitteeSignatures
    ```
    Alternatively, you can find ready-to use pattern file for the specified client, see:
    - [Nethermind Log Monitor](nethermind/log_monitor)
    - [Erigon Log Monitor](erigon/log_monitor)
    - [Lighthouse Beacon Log Monitor](lighthouse/beacon_log_monitor)
    - [Lodestar Beacon Log Monitor](lodestar/beacon_log_monitor)
    - [Teku Beacon Log Monitor](teku/beacon_log_monitor)
- Launch the shell script
```
/usr/local/bin/logmonitor.sh --service "serviceName" --targets="definition_file"
```
Sample:
```
/usr/local/bin/logmonitor.sh --service "lodestarBeacon.service" --targets="/usr/local/etc/lodestarbeaconlog_patterns.txt"
```
The script prints warning if any specified patter is found in the log. It also may process any execution action through `logmonitor_executor.sh` (see running executer section).

### Monitoring time from previous printed log
Simple timer that is reseted on each new line printed into the log. If no new line is printed within a specified time, the `logmonitor.sh` prints warning. It also may process any execution action through `logmonitor_executor.sh` (see running executer section)
The feature is being activated through attached parameter `--log_maxwaitingtime` specifying maximal enabled meantime between 2 log lines
Sample:
```
/usr/local/bin/logmonitor.sh --service "serviceName" --log_maxwaitingtime="500"
```

### Monitoring both at once
```
/usr/local/bin/logmonitor.sh --service "serviceName" --targets_file="definition_file" --log_maxwaitingtime="MaxnabledTimeFromPreviousLogLine"
```
Sample:
```
/usr/local/bin/logmonitor.sh --service "lodestarBeacon.service" --targets_file="/usr/local/etc/lodestarbeaconlog_patterns.txt" --log_maxwaitingtime="500"
```

## Running executor
Executor utility allows to execute any acction when certain pattern is reached (e.g. certain string found in a log for 50 times in a minute). Executor script is separated from `log_monitor`, as it's an optional extension of the `log_monitor` itself.

`logmonitor_executor.sh` is attached to `log_monitor` utility as a parameter and as so it may be individual for each service. Do not hesitate to rename its default name `logmonitor_executor.sh` for your custom client-based related name.

- Check the `logmonitor_executor.sh` script
```
curl -o- https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/log_monitor/logmonitor_executor.sh
```
- Download the script to `/usr/local/bin` directory
```
sudo curl -o /usr/local/logmonitor.sh https://raw.githubusercontent.com/Stakers-space/staking-scripts/main/log_monitor/logmonitor_executor.sh
```
- Enable execution of the shell script
```
sudo chmod +x /usr/local/bin/logmonitor_executor.sh
```
- Open the file and configurate execution actions
```
sudo nano /usr/local/bin/logmonitor_executor.sh
```
- Activate executor with adding executor-related arguments on launching `/usr/local/bin/logmonitor.sh`.
```
/usr/local/bin/logmonitor.sh --service "serviceName" --targets="definition_file" --executer_trigger_pause="MaxnabledTimeFromPreviousLogLine" ...
```
Sample:
```
/usr/local/bin/logmonitor.sh --service "lodestarBeacon.service" --targets="/usr/local/etc/lodestarbeaconlog_patterns.txt" --executer_trigger_pause="500" ...
```



## Service files configuration

## [Optional]  Run the service on background
> [!NOTE]
> Steps below expects you are running Lodestar beacon under `tekubeacon` service.

Set files ownership
```
sudo chown tekubeacon:tekubeacon /usr/local/bin/logmonitor_executor.sh
```
```
sudo chown tekueacon:tekubeacon /usr/local/etc/lodestarbeaconlog_patterns.txt
```

- Define service file
- Start the service
Enable the service
```
sudo systemctl enable customName_logmonitor.service
```
Start the service
```
sudo systemctl start customName_logmonitor.service
```

### Monitor the service
```
systemctl status customName_logmonitor.service
```
```
journalctl -fu customName_logmonitor.service
```
Monitor the service together with tekubeacon service
```
journalctl -f -u customName.service -u customName_logmonitor.service
```