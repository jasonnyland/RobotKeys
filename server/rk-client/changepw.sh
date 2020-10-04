#!/bin/bash
name=WEBDAV_USERNAME
pass=WEBDAV_PASSWORD
b1=Lrsp8fEfIuGFxWR2s4vj
b2=l58vPPTyeUWe1sxTe3ZN

### arg enforcement
if [ $# -ne 2 ]; then; echo "Invalid args.  Use ./changepw.sh username password"; exit 1; fi
# set new username/password
sed -i "s/\($name *= *\).*/\1$1/" docker-compose.yml
sed -i "s/\($pass *= *\).*/\1$2/" docker-compose.yml
# remove old dockers and re-run compose
sudo docker stop $(sudo docker ps -a -q)
sudo docker rm $(sudo docker ps -a -q)
sudo docker-compose up -d
# remove plaintext user data from dockerfile
sed -i "s/\($name *= *\).*/\1$b1/" docker-compose.yml
sed -i "s/\($pass *= *\).*/\1$b2/" docker-compose.yml

