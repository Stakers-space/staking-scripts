#!/bin/bash

echo "--- Updating packaging list..."
sudo apt update

echo "\n--- Installing Updates..."
sudo apt upgrade -y

echo "\n--- Processing dist-upgrade..."
sudo apt dist-upgrade -y

echo "\n--- Removing unused packages..."
sudo apt autoremove -y

echo "\n--- Restarting OS..."
sudo reboot