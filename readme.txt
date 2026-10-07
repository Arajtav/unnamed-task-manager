This is a (still) simple tasks manager we tried to make in under a month for no reason.
It I believe is usable although UI/UX is terrible.

To start you need to set envs, there are comments in .env.example.
You also need to create a sqlite database, run migrations and insert an admin account,
```sql
insert into user (id, is_admin, invite_code) values (x'abcdabcdabcdabcdabcdabcdabcdabcd', true, 'AAAA-AAAA-AAAA');
```
or something like that.
Then you can register and do all the stuff from the UI.
