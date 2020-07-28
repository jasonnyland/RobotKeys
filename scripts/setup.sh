#!/bin/bash
### required args:  url, username, password
if [ $# -ne 3 ]; then; echo "Invalid args.  Use ./setup.sh url username password"; fi
url=$1
username=$2
password=$3

### install docker ###
sudo apt update
sudo apt upgrade -y
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu focal stable"
sudo apt update
### apt-cache policy docker-ce
sudo apt install -y docker-ce
sudo systemctl status docker

### setup directories ###
cd
mkdir ./docker
mkdir ./docker/letsencrypt
mkdir ./docker/letsencrypt/config
mkdir ./docker/webdav
mkdir ./docker/webdav/public

### install docker-compose ###
sudo curl -L "https://github.com/docker/compose/releases/download/1.26.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
sudo ln -s /usr/local/bin/docker-compose /usr/bin/docker-compose

### git clone the starting files ###
git clone https://github.com/jasonnyland/rk-client.git
# (will need user/pass)
cd rk-client
./firstrun.sh $url $username $password
sudo docker-compose up -d

### configure nginx reverse proxy ###
mv default ~/docker/letsencrypt/config/nginx/site-confs/
sudo docker container restart letsencrypt
