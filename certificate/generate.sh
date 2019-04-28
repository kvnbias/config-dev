#!/bin/bash

domain="localhost"
currdir="$(cd "$( dirname "$0" )" && pwd)"
passphrase="passphrase"

if [ "$1" != "" ]; then
  domain="$1";

  echo "
[req]
default_bits       = 2048
default_md         = sha256
distinguished_name = req_subj

[req_subj]
countryName                    = Country Name (2 letter code)
countryName_default            = PH

stateOrProvinceName            = State or Province Name (full name)
stateOrProvinceName_default    = NCR

localityName                   = Locality Name (eg, city)
localityName_default           = Manila

organizationName               = Organization Name (eg, company)
organizationName_default       = AAA - Local

organizationalUnitName         = Organizational Unit Name (e.g., section)
organizationalUnitName_default = Dev

commonName                     = Common Name (e.g. server FQDN or YOUR name)
commonName_default             = www.localhost.com

emailAddress                   = Email Address
emailAddress_default           = test@localhost.com

[ SAN ]
subjectAltName=@alt_names

[ alt_names ]
IP.1  = 127.0.0.1
DNS.1 = $domain
" | tee $currdir/$domain.conf

  echo "
authorityKeyIdentifier = keyid,issuer
basicConstraints       = CA:FALSE
keyUsage               = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
subjectAltName         = @alt_names

[alt_names]
IP.1  = 127.0.0.1
DNS.1 = $domain
" | tee $currdir/$domain.ext
fi

echo "


> Just press enter


"

[ -f $currdit/$domain-ca.key ] && sudo rm $currdir/$domain-ca.key
[ -f $currdit/$domain-ca.pem ] && sudo rm $currdir/$domain-ca.pem
[ -f $currdit/$domain-ca.srl ] && sudo rm $currdir/$domain-ca.srl
[ -f $currdit/$domain.crt ]    && sudo rm $currdir/$domain.crt
[ -f $currdit/$domain.csr ]    && sudo rm $currdir/$domain.csr
[ -f $currdit/$domain.key ]    && sudo rm $currdir/$domain.key
[ -f $currdit/$domain.pass ]   && sudo rm $currdir/$domain.pass
[ -f $currdit/$domain.pem ]    && sudo rm $currdir/$domain.pem

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

[ -f $currdit/$domain-ca.key ] && sudo chown root:root $currdir/$domain-ca.key
[ -f $currdit/$domain-ca.pem ] && sudo chown root:root $currdir/$domain-ca.pem
[ -f $currdit/$domain-ca.srl ] && sudo chown root:root $currdir/$domain-ca.srl
[ -f $currdit/$domain.crt ]    && sudo chown root:root $currdir/$domain.crt
[ -f $currdit/$domain.csr ]    && sudo chown root:root $currdir/$domain.csr
[ -f $currdit/$domain.key ]    && sudo chown root:root $currdir/$domain.key
[ -f $currdit/$domain.pass ]   && sudo chown root:root $currdir/$domain.pass
[ -f $currdit/$domain.pem ]    && sudo chown root:root $currdir/$domain.pem


[ -f $currdit/$domain-ca.key ] && sudo chmod 644 $currdir/$domain-ca.key
[ -f $currdit/$domain-ca.pem ] && sudo chmod 644 $currdir/$domain-ca.pem
[ -f $currdit/$domain-ca.srl ] && sudo chmod 644 $currdir/$domain-ca.srl
[ -f $currdit/$domain.crt ]    && sudo chmod 644 $currdir/$domain.crt
[ -f $currdit/$domain.csr ]    && sudo chmod 644 $currdir/$domain.csr
[ -f $currdit/$domain.key ]    && sudo chmod 644 $currdir/$domain.key
[ -f $currdit/$domain.pass ]   && sudo chmod 644 $currdir/$domain.pass
[ -f $currdit/$domain.pem ]    && sudo chmod 644 $currdir/$domain.pem

if [ "$1" != "" ]; then
  sudo rm $currdir/$domain.conf
  sudo rm $currdir/$domain.ext
fi

echo "

If using SELinux make sure the certificates have 'httpd_sys_content_t' context

For firefox:
> Now go to: about:preferences#privacy
> Go to Certificates
> Go to View Certificates
> Go to Authorities tab
> Import '$domain-ca.pem'
> Point '$domain.crt' && '$domain.key' to your server

For chrome:
> Now go to: chrome://settings/certificates
> Go to Authorities tab
> Import '$domain-ca.pem'
> Point '$domain.crt' && '$domain.key' to your server


"