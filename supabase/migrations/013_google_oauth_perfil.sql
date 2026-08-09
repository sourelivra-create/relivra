-- ============================================================
-- RELIVRA – Migration 013: perfil correto pra login com Google
-- ============================================================
-- O trigger handle_new_user() só lia raw_user_meta_data->>'nome',
-- que é a chave usada no cadastro por email/senha (signUp com
-- options.data.nome). Login via Google não passa por esse cadastro
-- — o Supabase preenche raw_user_meta_data com as chaves 'full_name'
-- e 'name' do Google, além de 'avatar_url'. Sem essa migration, todo
-- usuário que entrar via Google cairia no fallback 'Usuário' sem
-- nome nenhum, mesmo o Google mandando o nome certinho.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, nome, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'nome',       -- cadastro por email/senha
      NEW.raw_user_meta_data->>'full_name',  -- Google OAuth
      NEW.raw_user_meta_data->>'name',       -- Google OAuth (variante)
      'Usuário'
    ),
    NEW.raw_user_meta_data->>'avatar_url'    -- Google manda foto de perfil; email/senha não manda nada (fica null, ok)
  );
  RETURN NEW;
END;
$function$;
