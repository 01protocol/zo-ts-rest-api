source .env

./source/build-linux

read -p "Press [Enter] key to close..."
kill $(lsof -t -i:8080)

