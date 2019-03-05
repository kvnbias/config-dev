#!/bin/bash

if ls /etc/php | grep -q $1; then
  if ls /usr/bin | grep -q php; then
    echo "Deleting PHP exec file";
    sudo rm -rf /usr/bin/php;
  fi
  if ls /usr/bin | grep -q composer; then
    echo "Deleting composer file";
    sudo rm -rf /usr/bin/composer;
  fi
  if ls /usr/lib/systemd/system | grep -q php-fpm.service; then
    if systemctl status php-fpm.service | grep -q enabled; then
      echo "Disabling PHP-FPM";
      sudo systemctl disable php-fpm.service;
    fi
    if systemctl status php-fpm.service | grep -q running; then
      echo "Stopping PHP-FPM";
      sudo systemctl stop php-fpm.service;
    fi

    echo "Deleting PHP-FPM service";
    sudo rm -rf /usr/lib/systemd/system/php-fpm.service;
  fi

  echo "Copying PHP exec file";
  sudo ln -sf /etc/php/$1/bin/php /usr/bin/php;
  echo "Copying Composer exec file";
  sudo ln -sf /etc/php/$1/bin/composer /usr/bin/composer;
  echo "Copying PHP-FPM service";
  sudo ln -s /etc/php/$1/etc/systemd/system/php-fpm.service /usr/lib/systemd/system/php-fpm.service;
  echo "Enabling PHP-FPM service";
  sudo systemctl enable php-fpm.service;
  echo "Starting PHP-FPM service";
  sudo systemctl start php-fpm.service;

  php -v;
  systemctl status php-fpm;
else
  echo "PHP Prefix List: ";
  ls /etc/php
fi