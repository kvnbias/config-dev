#!/bin/bash

currdir="$(pwd)"
domain=www.localhost.com
passphrase=passphrase

echo "


> Just press enter


"

openssl genrsa -passout pass:$passphrase -des3 -out $currdir/$domain-ca.key 2048

openssl req -passin pass:$passphrase -x509 -new -nodes -key $currdir/$domain-ca.key \
-reqexts SAN -config $currdir/$domain.conf -sha256 -days 1825 -out $currdir/$domain-ca.pem

openssl genrsa -out $currdir/$domain.key 2048


openssl req -new -key $currdir/$domain.key -config $currdir/$domain.conf \
-out $currdir/$domain.csr

openssl x509 -req -in $currdir/$domain.csr -CA $currdir/$domain-ca.pem \
-passin pass:$passphrase -CAkey $currdir/$domain-ca.key -CAcreateserial \
-out $currdir/$domain.crt -days 1825 -sha256 -extfile $currdir/$domain.ext

cat $currdir/$domain.crt $currdir/$domain.key > $currdir/$domain.pem
echo $passphrase >> $currdir/$domain.pass

sudo chown root:root $currdir/$domain-ca.key
sudo chown root:root $currdir/$domain-ca.pem
sudo chown root:root $currdir/$domain-ca.srl
sudo chown root:root $currdir/$domain.crt
sudo chown root:root $currdir/$domain.csr
sudo chown root:root $currdir/$domain.key
sudo chown root:root $currdir/$domain.pass
sudo chown root:root $currdir/$domain.pem

sudo chmod 600 $currdir/$domain-ca.key
sudo chmod 600 $currdir/$domain-ca.pem
sudo chmod 600 $currdir/$domain-ca.srl
sudo chmod 600 $currdir/$domain.crt
sudo chmod 600 $currdir/$domain.csr
sudo chmod 600 $currdir/$domain.key
sudo chmod 600 $currdir/$domain.pass
sudo chmod 600 $currdir/$domain.pem

echo "

If using SELinux make sure the certificates have `httpd_sys_content_t` context

For firefox:
> Now go to: about:preferences#privacy
> Go to Certificates
> Go to View Certificates
> Go to Authorities tab
> Import 'www.localhost.com-ca.pem'
> Point 'www.localhost.com.crt' && 'www.localhost.com.key' to your server

For chrome:
> Now go to: chrome://settings/certificates
> Go to Authorities tab
> Import 'www.localhost.com-ca.pem'
> Point 'www.localhost.com.crt' && 'www.localhost.com.key' to your server


"