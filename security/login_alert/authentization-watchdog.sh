#!/bin/bash

ACCOUNT_ID=0
SERVER_ID=0
API_TOKEN=""
NOTIFICATOR_URL="https://stakers.space/api/alert/login"

# authentization log file
LOG_FILE="/var/log/auth.log"
# temporary file for keeping last checked authentization state
TMP_FILE="/tmp/login_activity_last_check"
declare -r version="1.0.1"

use_shell_parameters() {
    TEMP=$(getopt -o a:s:t:u: --long account_id:,server_id:,api_token:,notification_url:, -- "$@")
    eval set -- "$TEMP"

    while true; do
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
             --) 
                shift
                break
                ;;
            *)
                echo "Warning | Unknown parameter $2 | all parameters $@"
                exit 1
                ;;
        esac
    done
}

print_hello_message() {
    echo -e "\nAuthentization Watchdog | version: $version | Created by https://stakers.space"
    echo -e "├── -a|--account_id (= $ACCOUNT_ID):  Account ID at Stakers.space"
    echo -e "├── -s|--server_id  (= $SERVER_ID):   Server ID at Stakers.space"
    echo -e "└── -t|--api_token  (= $API_TOKEN):   token for communication with Stakers.space API"
}

use_shell_parameters "$@"
print_hello_message

# Create TMP_FILE if it does not exist
if [ ! -f "$TMP_FILE" ]; then
    # Check time of start of the last day
    echo "TMP_FILE does not exist. Initializing for the last day's logs."
    LAST_POS=$(grep -n "$(date --date='yesterday' '+%b %_d')" "$LOG_FILE" | tail -n 1 | cut -d: -f1)
    if [ -z "$LAST_POS" ]; then
        LAST_POS=$(wc -l < "$LOG_FILE")
    fi
    echo "$LAST_POS" > "$TMP_FILE"
else
    LAST_POS=$(cat "$TMP_FILE")
fi

LAST_POS=$(cat "$TMP_FILE")
NEW_POS=$(wc -l < "$LOG_FILE")

if [ "$NEW_POS" -gt "$LAST_POS" ]; then
    tail -n +"$((LAST_POS + 1))" "$LOG_FILE" | \
    grep -E "pam_unix\(sshd:session\): session opened|pam_unix\(login:session\): session opened|Accepted|authentication failure|Failed password" | \
    grep -v "sudo" | while read -r line; do
   
        echo "Entry line: $line"
        case "$line" in
            *"pam_unix(sshd:session): session opened"*)
                STATUS="success-ssh"
                ;;
            *"pam_unix(login:session): session opened"*)
                STATUS="success-local"
                ;;
            *"authentication failure"*)
                STATUS="failure"
                ;;
            *"Failed password"*)
                STATUS="failure-password"
                ;;
            *)
                STATUS="unknown"
                continue
                ;;
        esac
  
        echo "POSTING $NOTIFICATOR_URL --data-urlencode login=$STATUS&acc=$ACCOUNT_ID&tkn=$API_TOKEN&sid=$SERVER_ID"

        #curl -G "$NOTIFICATOR_URL" --data-urlencode "l=$STATUS" \
        #                            --data-urlencode "a=$ACCOUNT_ID" \
        #                            --data-urlencode "t=$API_TOKEN" \
        #                            --data-urlencode "s=$SERVER_ID"
    done

    echo "$NEW_POS" > "$TMP_FILE"
fi