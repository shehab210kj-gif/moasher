-- Admin guest account and admin read policies
-- Email: shehabhosny889@gmail.com
-- Password: admin123s

DO $$
DECLARE
  admin_id UUID := '9f4d91c0-0f43-4f38-a5f2-16e7a111f889';
  admin_email TEXT := 'shehabhosny889@gmail.com';
BEGIN
  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  )
  VALUES (
    admin_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    admin_email,
    crypt('admin123s', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Guest Admin"}'::jsonb,
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = COALESCE(auth.users.email_confirmed_at, EXCLUDED.email_confirmed_at),
    raw_app_meta_data = EXCLUDED.raw_app_meta_data,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    updated_at = NOW();

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'auth'
      AND table_name = 'identities'
      AND column_name = 'provider_id'
  ) THEN
    EXECUTE $identity$
      INSERT INTO auth.identities (
        id,
        user_id,
        provider_id,
        identity_data,
        provider,
        last_sign_in_at,
        created_at,
        updated_at
      )
      VALUES (
        '9f4d91c0-0f43-4f38-a5f2-16e7a111f889',
        '9f4d91c0-0f43-4f38-a5f2-16e7a111f889',
        'shehabhosny889@gmail.com',
        '{"sub":"9f4d91c0-0f43-4f38-a5f2-16e7a111f889","email":"shehabhosny889@gmail.com","email_verified":true}'::jsonb,
        'email',
        NOW(),
        NOW(),
        NOW()
      )
      ON CONFLICT (provider_id, provider) DO UPDATE
      SET identity_data = EXCLUDED.identity_data, updated_at = NOW()
    $identity$;
  ELSE
    EXECUTE $identity$
      INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        last_sign_in_at,
        created_at,
        updated_at
      )
      VALUES (
        '9f4d91c0-0f43-4f38-a5f2-16e7a111f889',
        '9f4d91c0-0f43-4f38-a5f2-16e7a111f889',
        '{"sub":"9f4d91c0-0f43-4f38-a5f2-16e7a111f889","email":"shehabhosny889@gmail.com","email_verified":true}'::jsonb,
        'email',
        NOW(),
        NOW(),
        NOW()
      )
      ON CONFLICT (id) DO UPDATE
      SET identity_data = EXCLUDED.identity_data, updated_at = NOW()
    $identity$;
  END IF;

  INSERT INTO public.profiles (id, full_name, email, role, subscription_plan, created_at, updated_at)
  VALUES (admin_id, 'Guest Admin', admin_email, 'admin', 'premium', NOW(), NOW())
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    role = 'admin',
    subscription_plan = 'premium',
    updated_at = NOW();
END $$;

CREATE POLICY "Admins can select all properties" ON public.properties
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can select all analysis reports" ON public.analysis_reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can select all comparables" ON public.comparables
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
