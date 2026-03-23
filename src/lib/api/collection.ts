import { supabase } from '@/integrations/supabase/client';
import type { IdentificationResult, OfficialImage } from './identifyCollectible';

async function getCurrentUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autenticado');
  return user.id;
}

export interface CollectionItem {
  id: string;
  created_at: string;
  name: string;
  category: string;
  year: number | null;
  set_or_edition: string | null;
  catalog_id: string | null;
  tcg_set_id: string | null;
  card_number: string | null;
  variant: string | null;
  rarity: string | null;
  condition_estimate: string | null;
  special_features: string[];
  description: string | null;
  estimated_value_usd: number | null;
  confidence: number | null;
  user_photo_url: string | null;
  official_image_url: string | null;
  official_image_source: string | null;
  official_image_attribution: string | null;
  official_image_source_url: string | null;
  official_card_id: string | null;
  official_set_name: string | null;
  official_card_number: string | null;
  notes: string | null;
  grading_company: string | null;
  grading_value: string | null;
}

export async function addToCollection(
  identification: IdentificationResult,
  officialImage: OfficialImage | null,
  userPhotoBase64: string | null,
  gradingCompany: string | null = null,
  gradingValue: string | null = null,
): Promise<CollectionItem> {
  // Store user photo as base64 in the DB for now (will use storage later)
  const userId = await getCurrentUserId();
  const { data, error } = await supabase
    .from('collection_items')
    .insert({
      user_id: userId,
      name: identification.name,
      category: identification.category,
      year: identification.year,
      set_or_edition: identification.set_or_edition,
      catalog_id: identification.catalog_id,
      tcg_set_id: identification.tcg_set_id,
      card_number: identification.card_number,
      variant: identification.variant,
      rarity: identification.rarity,
      condition_estimate: identification.condition_estimate,
      special_features: identification.special_features,
      description: identification.description,
      estimated_value_usd: identification.estimated_value_usd,
      confidence: identification.confidence,
      user_photo_url: userPhotoBase64,
      official_image_url: officialImage?.imageUrl || null,
      official_image_source: officialImage?.source || null,
      official_image_attribution: officialImage?.attribution || null,
      official_image_source_url: officialImage?.sourceUrl || null,
      official_card_id: officialImage?.cardId || null,
      official_set_name: officialImage?.setName || null,
      official_card_number: officialImage?.number || null,
      grading_company: gradingCompany,
      grading_value: gradingValue,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as CollectionItem;
}

export async function getCollection(): Promise<CollectionItem[]> {
  const { data, error } = await supabase
    .from('collection_items')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []) as CollectionItem[];
}

export async function removeFromCollection(id: string): Promise<void> {
  const { error } = await supabase
    .from('collection_items')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function updateItemNotes(id: string, notes: string): Promise<void> {
  const { error } = await supabase
    .from('collection_items')
    .update({ notes })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function updateItemGrade(id: string, gradingCompany: string | null, gradingValue: string | null): Promise<void> {
  const { error } = await supabase
    .from('collection_items')
    .update({ grading_company: gradingCompany, grading_value: gradingValue })
    .eq('id', id);
  if (error) throw new Error(error.message);
}
