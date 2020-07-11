#!/bin/bash

sudo apt update
sudo apt upgrade

sudo apt install -y nginx software-properties-common
sudo add-apt-repository universe
sudo add-apt-repository ppa:certbot/certbot
##press enter to continue?##
sudo apt update
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx
## prompts for email, (a)gree, (n)o, dev,robotkeys.com, 2
sudo apt install -y apache2-utils
sudo htpasswd -c /etc/nginx/htpasswd username
## prompts for password, retype
mkdir ~/secure_html
sudo chown www-data:www-data ~/secure_html
sudo chmod 2770 ~/secure_html
sudo usermod -aG www-data ubuntu
## logout and login
touch ~/secure_html/test.txt
sudo chown :www-data ~/secure_html/*
## replace /etc/nginx/sites-available/default with new nginx config
sudo service nginx restart

