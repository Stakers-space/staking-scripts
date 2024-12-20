#!/bin/bash
ACCOUNT_ID=0
SERVER_ID=0
API_TOKEN=""
NOTIFICATOR_URL="https://stakers.space/api/alert/login"

# authentization log file
LOG_FILE="/var/log/auth.log"
# temporary filr for keepin last checked authentization state
TMP_FILE="/tmp/login_activity_last_check"
declare -r version="1.0.0"

use_shell_parameters() {
    TEMP=$(getopt -o a:s:t:u: --long account_id:,server_id:,api_token:,notification_url: -- "$@")
    #echo "TEMP before eval: $TEMP"
    eval set -- "$TEMP"

    # params
    while true; do
        #echo "Params after eval set: $1 $2"
        case "$1" in
            -a|--account_id)
                ACCOUNT_ID="$2"
                shift 2
                if [ -z "$ACCOUNT_ID" ]; then
                    echo "Error: No Account ID specified."
                    exit 1
                fi
                ;;
            -s|--server_id)
                SERVER_ID="$2"
                shift 2
                if [ -z "$SERVER_ID" ]; then
                    echo "Error: No Server ID specified."
                    exit 1
                fi
                ;;
            -t|--api_token)
                API_TOKEN="$2"
                shift 2
                if [ -z "$API_TOKEN" ]; then
                    echo "Error: No API token specified."
                    exit 1
                fi
                ;; 
            -u|--notification_url) 
                NOTIFICATOR_URL="$2"
                shift 2
                if [ -z "$NOTIFICATOR_URL" ]; then
                    echo "Error: No Notification URL specified."
                    exit 1
                fi
                ;;
            *)
                echo "Warning | Unknown parameter $2 | all parameters $@"
                exit 1
                ;;
        esac
    done
}

print_hello_message() {
    echo -e "\nAuthentization Watchdog | v: $version | Created by https://stakers.space"
    echo -e "├── -a|--account_id:   Account ID"
    echo -e "├── -s|--server_id:    Server ID"
    echo -e "├── -t|--api_token:    token for communication with server API"
    echo -e "└── -u|--notification_url (optional) | Server for alert procession"
}

use_shell_parameters "$@"
print_hello_message

# Create tmp file if it does not exist
if [ ! -f "$TMP_FILE" ]; then
    echo "0" > "$TMP_FILE"
fi

# Get last position from TMP_FILE
LAST_POS=$(cat "$TMP_FILE")

NEW_POS=$(wc -l < "$LOG_FILE")
if [ "$NEW_POS" -gt "$LAST_POS" ]; then
    tail -n +"$((LAST_POS + 1))" "$LOG_FILE" | grep -E "session opened|session closed|Failed password|Accepted password" | grep -v "pam_unix(cron:session)" | while read -r line; do
        echo "Detected login activity: $line | Posting through $NOTIFICATOR_URL"

        curl -G "$NOTIFICATOR_URL" --data-urlencode "log=$line&acc=$ACCOUNT_ID&tkn=$API_TOKEN&sid=$SERVER_ID"
    done
    
    # Update tmp file
    echo "$NEW_POS" > "$TMP_FILE"
fi