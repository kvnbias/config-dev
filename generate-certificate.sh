#!/bin/bash

currdir="$(pwd)"
domain=www.localhost.com
passphrase=chickenburrito

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

echo "

For chrome:
> Now go to: chrome://settings/certificates
> Go to authorities tab
> Import `www.localhost.com-ca.pem`
> Point `www.localhost.com.crt` && `www.localhost.com.key` to your server


"