# Superintendent
Discord bot for letting ticket slaves give roles in managed way

## Building
```sh
$ git clone https://github.com/scaratech/superintendent
$ cd superintendent
$ pnpm i
$ pnpm build
$ pnpm build
```

## Configuration
```sh
$ nano .env
# TOKEN=BOT_TOKEN
# ADMIN=ADMIN_ROLE_ID
# SUPPORT=SUPPORT_ROLE_ID
# GUILD_ID=GUILD_ID
```

## Usage
### Ticket Slaves
```
/grant user:<@UID> role:ROLE_ID
/ungrant user:<@UID> role:ROLE_ID
/roles
```
### Admins
```
/add role:ROLE_ID
/remove role:ROLE_ID
```