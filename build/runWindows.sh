source .env

./source/build-win.exe

read -p "Press [Enter] key to close..."
kill $(lsof -t -i:8080)

