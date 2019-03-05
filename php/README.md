
### Repo
https://php-build.github.io/

### Make Dependencies

**Arch:**

```
autoconf         bzip2     curl       gcc                icu
libjpeg-turbo    libpng    libtidy    libxml2            libxslt
libzip           make      openssl    postgresql-libs    readline
tar
```

**Fedora:**

```
autoconf         bzip2            bzip2-devel            gcc-c++
libcurl-devel    libicu-devel     libjpeg-turbo-devel    libpng-devel
libtidy-devel    libxml2-devel    libxslt-devel          libzip-devel
make             openssl-devel    postgresql-devel       readline-devel
tar
```

### PHP version switcher installation

* Create a file `/usr/bin/php-switch` with the following contents (version switcher):
```
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
```

* Pre installation
```
$ git clone git://github.com/php-build/php-build.git
$ cd php-build
```

* Before installing `php-build` you may want to add more extensions, edit:
`/php-build/share/php-build/default_configure_options`

* Install `php-build`.
```
$ sudo ./install.sh
```

* After installation:
```
$ sudo php-build -v 7.3.0 /etc/php/<your-prefix>

```

* Install composer:
```
$ /etc/php/<your-prefix>/bin/php -r "copy('https://getcomposer.org/installer', 'composer-setup.php');"
$ /etc/php/<your-prefix>/bin/php -r "if (hash_file('sha384', 'composer-setup.php') === '48e3236262b34d30969dca3c37281b3b4bbe3221bda826ac6a9a62d6444cdb0dcd0615698a5cbe587c3f0fe57a54d8f5') { echo 'Installer verified'; } else { echo 'Installer corrupt'; unlink('composer-setup.php'); } echo PHP_EOL;"

Installer verified

$ sudo /etc/php/<your-prefix>/bin/php composer-setup.php --install-dir=/etc/php/<your-prefix>/bin
$ /etc/php/<your-prefix>/bin/php -r "unlink('composer-setup.php');"
```

* **OPTIONAL:** Update the php.ini file (as settings overriding and extension) on `/etc/php/<your-prefix>/etc/conf.d`

* **OPTIONAL:** Customize PHP-FPM settings on `/etc/php/<your-prefix>/etc/php-fpm.conf`

* **OPTIONAL:** Update/Create php-fpm settings on `/etc/php/<your-prefix>/etc/php-fpm.d`

* Execute `php-switch` to change versions:
```
$ sudo php-switch <your-prefix>
```

