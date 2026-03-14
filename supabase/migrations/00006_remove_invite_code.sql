-- Remove invite link feature: drop related functions and column

drop function if exists get_family_by_invite_code(text);
drop function if exists join_family(text, text, uuid);
drop function if exists join_family(text, text);

alter table families drop column if exists invite_code;
