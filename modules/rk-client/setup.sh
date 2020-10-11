#!/bin/bash
export DEBIAN_FRONTEND=noninteractive
export COMPOSE_HTTP_TIMEOUT=200
url=$1
username=$2
password=$3
url=URL
srv=server_name
name=WEBDAV_USERNAME
pass=WEBDAV_PASSWORD

### install docker ###
apt-get update -y
apt-get upgrade -y
apt-get install -y apt-transport-https ca-certificates curl software-properties-common
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | apt-key add - # 2> /dev/null
add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu focal stable"
apt-get update -y
### apt-cache policy docker-ce
apt-get install -y docker-ce
systemctl status docker

### setup directories ###
cd /home/ubuntu/
mkdir -p /home/ubuntu/docker/letsencrypt/config
mkdir -p /home/ubuntu/docker/webdav/public
mkdir -p /home/ubuntu/docker/letsencrypt/config/nginx/site-confs/

### install docker-compose ###
curl -L "https://github.com/docker/compose/releases/download/1.26.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
ln -s /usr/local/bin/docker-compose /usr/bin/docker-compose

### update parameters in docker/nginx configs ###
cd /home/ubuntu/rk-client

# cusomize configuration file for nginx reverse proxy
sed -i "s/\($srv *\).*/\1$1/" ./default
mv -f ./default /home/ubuntu/docker/letsencrypt/config/nginx/site-confs/
# customize configuration file for docker-compose
sed -i "s/\($url *= *\).*/\1$1/" ./docker-compose.yml
sed -i "s/\($name *= *\).*/\1$2/" ./docker-compose.yml
sed -i "s/\($pass *= *\).*/\1$3/" ./docker-compose.yml
# launch docker containers
#docker-compose up -d
# remove plaintext user data from dockerfile
# sed -i "s/\($name *= *\).*/\1$/" ./docker-compose.yml
# sed -i "s/\($pass *= *\).*/\1$/" ./docker-compose.yml

### configure nginx reverse proxy ###

#systemctl restart docker
#docker container restart letsencrypt

##shutdown --reboot now