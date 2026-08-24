"use strict";

const SUPABASE_URL = "https://xnhscrugektzhxatgccl.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_QPys1fzM388AxhSqwum1hw_IC4Q6kzu";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);