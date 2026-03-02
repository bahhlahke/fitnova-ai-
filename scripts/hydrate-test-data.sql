DO $$
DECLARE
    target_email TEXT := 'ironcladintelligence@gmail.com';
    target_user_id UUID;
    i INT;
    curr_date DATE;
    weight_val NUMERIC := 185.5;
    cal_val INT;
BEGIN
    SELECT id INTO target_user_id FROM auth.users WHERE email = target_email LIMIT 1;

    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'User with email % not found. Please ensure you have signed up in the app first.', target_email;
    END IF;

    INSERT INTO public.user_profile (user_id, name, email, age, sex, height, weight, goals, subscription_status)
    VALUES (target_user_id, 'Test User', target_email, 32, 'male', 180, 185, ARRAY['Weight loss', 'Muscle gain'], 'pro')
    ON CONFLICT (user_id) DO UPDATE SET subscription_status = 'pro';

    FOR i IN 0..20 LOOP
        curr_date := (CURRENT_DATE - (i || ' days')::INTERVAL)::DATE;
        
        IF i % 3 = 0 THEN
            INSERT INTO public.progress_tracking (user_id, date, weight, notes)
            VALUES (target_user_id, curr_date, weight_val - (i * 0.1), 'Automatic test log')
            ON CONFLICT DO NOTHING;
        END IF;

        cal_val := 2200 + (random() * 200)::INT;
        INSERT INTO public.nutrition_logs (user_id, date, total_calories, macros, meals)
        VALUES (
            target_user_id, 
            curr_date, 
            cal_val, 
            jsonb_build_object('protein', 180, 'carbs', 220, 'fat', 70),
            jsonb_build_array(jsonb_build_object('name', 'Simulated Meal', 'calories', cal_val))
        ) ON CONFLICT DO NOTHING;

        IF EXTRACT(DOW FROM curr_date) IN (1, 2, 4, 6) THEN
            INSERT INTO public.workout_logs (user_id, date, workout_type, duration_minutes, perceived_exertion, exercises)
            VALUES (
                target_user_id,
                curr_date,
                CASE WHEN i % 2 = 0 THEN 'strength' ELSE 'cardio' END,
                45 + (random() * 30)::INT,
                7,
                jsonb_build_array(
                    jsonb_build_object('name', 'Bench Press', 'sets', 3, 'reps', 10),
                    jsonb_build_object('name', 'Squat', 'sets', 3, 'reps', 10)
                )
            ) ON CONFLICT DO NOTHING;
        END IF;

        INSERT INTO public.daily_plans (user_id, date_local, plan_json)
        VALUES (
            target_user_id,
            curr_date,
            jsonb_build_object(
                'training_plan', jsonb_build_object('focus', 'Simulated Focus'),
                'nutrition_plan', jsonb_build_object('calorie_target', 2300)
            )
        ) ON CONFLICT DO NOTHING;

    END LOOP;

    FOR i IN 0..2 LOOP
        INSERT INTO public.weekly_plans (user_id, week_start_local, plan_json)
        VALUES (
            target_user_id,
            (CURRENT_DATE - (EXTRACT(DOW FROM CURRENT_DATE)::INT + i * 7 + 6) * INTERVAL '1 day')::DATE,
            jsonb_build_object('summary', 'Simulated week ' || (3 - i))
        ) ON CONFLICT (user_id, week_start_local) DO NOTHING;
    END LOOP;

END $$;
