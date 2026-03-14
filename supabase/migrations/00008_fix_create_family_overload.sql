-- Drop the old create_family overload (without for_user_id parameter)
drop function if exists create_family(text, text);
