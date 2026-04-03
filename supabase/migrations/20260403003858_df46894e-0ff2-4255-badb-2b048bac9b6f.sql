UPDATE public.collection_items 
SET official_image_url = NULL, 
    official_image_source = NULL, 
    official_image_attribution = NULL, 
    official_image_source_url = NULL, 
    official_card_id = NULL, 
    official_set_name = NULL, 
    official_card_number = NULL 
WHERE name = 'Black Lotus' AND official_image_source = 'Pokémon TCG API';