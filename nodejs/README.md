
### Repo
https://github.com/creationix/nvm

### Must haves
yarn - https://yarnpkg.com/en/

### Installation
```
wget -qO- https://raw.githubusercontent.com/creationix/nvm/v0.34.0/install.sh | bash
```

### Logging (Enforced SELinux)

For the logging to work, the dir must be created with the ownership of the user.
Winston will automatically create the log file.

```
$ sudo ls -laZ /var/log

drwxr-xr-x. 21 root    root            system_u:object_r:var_log_t:s0                  4096 Dec 31 03:46 .
drwxr-xr-x. 22 root    root            system_u:object_r:var_t:s0                      4096 Oct 25 08:03 ..
drwxr-xr-x.  2 user     user             unconfined_u:object_r:var_log_t:s0              4096 Dec 31 03:49 nodejs

```
