
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "banners": {
                  Row: {
                    "business_id": number | null,"ends_at": string | null,"id": number,"image_url": string | null,"is_active": boolean,"link_url": string | null,"placement": string,"sort_order": number,"starts_at": string | null,"title": string | null
                  }
                  Insert: {
                    "business_id"?: number | null,"ends_at"?: string | null,"id"?: number,"image_url"?: string | null,"is_active"?: boolean,"link_url"?: string | null,"placement"?: string,"sort_order"?: number,"starts_at"?: string | null,"title"?: string | null
                  }
                  Update: {
                    "business_id"?: number | null,"ends_at"?: string | null,"id"?: number,"image_url"?: string | null,"is_active"?: boolean,"link_url"?: string | null,"placement"?: string,"sort_order"?: number,"starts_at"?: string | null,"title"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "banners_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    }
                  ]
                },"business_categories": {
                  Row: {
                    "business_id": number,"category_id": number,"is_primary": boolean
                  }
                  Insert: {
                    "business_id": number,"category_id": number,"is_primary"?: boolean
                  }
                  Update: {
                    "business_id"?: number,"category_id"?: number,"is_primary"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "business_categories_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "business_categories_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    }
                  ]
                },"business_members": {
                  Row: {
                    "business_id": number,"created_at": string,"role": Database["public"]['Enums']["member_role"],"user_id": string
                  }
                  Insert: {
                    "business_id": number,"created_at"?: string,"role"?: Database["public"]['Enums']["member_role"],"user_id": string
                  }
                  Update: {
                    "business_id"?: number,"created_at"?: string,"role"?: Database["public"]['Enums']["member_role"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "business_members_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    }
                  ]
                },"businesses": {
                  Row: {
                    "accepts_quote": boolean,"address": string | null,"city_id": number,"cover_url": string | null,"created_at": string,"custom_slug": string | null,"delivery_fee_cents": number,"description": string | null,"email": string | null,"featured_until": string | null,"fulfillment": (Database["public"]['Enums']["fulfillment_mode"])[],"id": number,"instagram": string | null,"is_featured": boolean,"latitude": number | null,"legacy_wp_id": number | null,"logo_url": string | null,"longitude": number | null,"min_order_cents": number,"name": string,"neighborhood": string | null,"opening_hours": NonNullable<Json>,"payment_methods": (string)[],"phone": string | null,"pix_key": string | null,"search_text": string,"search_tsvector": unknown,"slug": string,"source": string | null,"status": Database["public"]['Enums']["business_status"],"updated_at": string,"whatsapp": string | null
                  }
                  Insert: {
                    "accepts_quote"?: boolean,"address"?: string | null,"city_id": number,"cover_url"?: string | null,"created_at"?: string,"custom_slug"?: string | null,"delivery_fee_cents"?: number,"description"?: string | null,"email"?: string | null,"featured_until"?: string | null,"fulfillment"?: (Database["public"]['Enums']["fulfillment_mode"])[],"id"?: number,"instagram"?: string | null,"is_featured"?: boolean,"latitude"?: number | null,"legacy_wp_id"?: number | null,"logo_url"?: string | null,"longitude"?: number | null,"min_order_cents"?: number,"name": string,"neighborhood"?: string | null,"opening_hours"?: NonNullable<Json>,"payment_methods"?: (string)[],"phone"?: string | null,"pix_key"?: string | null,"search_text"?: string,"search_tsvector"?: never,"slug": string,"source"?: string | null,"status"?: Database["public"]['Enums']["business_status"],"updated_at"?: string,"whatsapp"?: string | null
                  }
                  Update: {
                    "accepts_quote"?: boolean,"address"?: string | null,"city_id"?: number,"cover_url"?: string | null,"created_at"?: string,"custom_slug"?: string | null,"delivery_fee_cents"?: number,"description"?: string | null,"email"?: string | null,"featured_until"?: string | null,"fulfillment"?: (Database["public"]['Enums']["fulfillment_mode"])[],"id"?: number,"instagram"?: string | null,"is_featured"?: boolean,"latitude"?: number | null,"legacy_wp_id"?: number | null,"logo_url"?: string | null,"longitude"?: number | null,"min_order_cents"?: number,"name"?: string,"neighborhood"?: string | null,"opening_hours"?: NonNullable<Json>,"payment_methods"?: (string)[],"phone"?: string | null,"pix_key"?: string | null,"search_text"?: string,"search_tsvector"?: never,"slug"?: string,"source"?: string | null,"status"?: Database["public"]['Enums']["business_status"],"updated_at"?: string,"whatsapp"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "businesses_city_id_fkey"
      columns: ["city_id"]
isOneToOne: false
      referencedRelation: "cities"
      referencedColumns: ["id"]
    }
                  ]
                },"categories": {
                  Row: {
                    "group_id": number | null,"id": number,"is_active": boolean,"is_order_capable": boolean,"name": string,"slug": string,"sort_order": number
                  }
                  Insert: {
                    "group_id"?: number | null,"id"?: number,"is_active"?: boolean,"is_order_capable"?: boolean,"name": string,"slug": string,"sort_order"?: number
                  }
                  Update: {
                    "group_id"?: number | null,"id"?: number,"is_active"?: boolean,"is_order_capable"?: boolean,"name"?: string,"slug"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "categories_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "groups"
      referencedColumns: ["id"]
    }
                  ]
                },"cities": {
                  Row: {
                    "created_at": string,"id": number,"is_active": boolean,"name": string,"slug": string,"state": string,"timezone": string
                  }
                  Insert: {
                    "created_at"?: string,"id"?: number,"is_active"?: boolean,"name": string,"slug": string,"state": string,"timezone"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: number,"is_active"?: boolean,"name"?: string,"slug"?: string,"state"?: string,"timezone"?: string
                  }
                  Relationships: [
                    
                  ]
                },"coupons": {
                  Row: {
                    "amount_off_cents": number | null,"business_id": number | null,"code": string,"ends_at": string | null,"id": number,"is_active": boolean,"max_uses": number | null,"min_order_cents": number,"percent_off": number | null,"starts_at": string | null,"used_count": number
                  }
                  Insert: {
                    "amount_off_cents"?: number | null,"business_id"?: number | null,"code": string,"ends_at"?: string | null,"id"?: number,"is_active"?: boolean,"max_uses"?: number | null,"min_order_cents"?: number,"percent_off"?: number | null,"starts_at"?: string | null,"used_count"?: number
                  }
                  Update: {
                    "amount_off_cents"?: number | null,"business_id"?: number | null,"code"?: string,"ends_at"?: string | null,"id"?: number,"is_active"?: boolean,"max_uses"?: number | null,"min_order_cents"?: number,"percent_off"?: number | null,"starts_at"?: string | null,"used_count"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "coupons_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    }
                  ]
                },"groups": {
                  Row: {
                    "id": number,"image_url": string | null,"is_active": boolean,"name": string,"slug": string,"sort_order": number
                  }
                  Insert: {
                    "id"?: number,"image_url"?: string | null,"is_active"?: boolean,"name": string,"slug": string,"sort_order"?: number
                  }
                  Update: {
                    "id"?: number,"image_url"?: string | null,"is_active"?: boolean,"name"?: string,"slug"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    
                  ]
                },"menu_categories": {
                  Row: {
                    "business_id": number,"description": string | null,"id": number,"image_url": string | null,"is_active": boolean,"name": string,"slug": string,"sort_order": number
                  }
                  Insert: {
                    "business_id": number,"description"?: string | null,"id"?: number,"image_url"?: string | null,"is_active"?: boolean,"name": string,"slug": string,"sort_order"?: number
                  }
                  Update: {
                    "business_id"?: number,"description"?: string | null,"id"?: number,"image_url"?: string | null,"is_active"?: boolean,"name"?: string,"slug"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "menu_categories_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    }
                  ]
                },"offers": {
                  Row: {
                    "business_id": number,"compare_at_cents": number | null,"description": string | null,"ends_at": string | null,"id": number,"image_url": string | null,"is_active": boolean,"link_url": string | null,"price_cents": number | null,"sort_order": number,"starts_at": string | null,"title": string
                  }
                  Insert: {
                    "business_id": number,"compare_at_cents"?: number | null,"description"?: string | null,"ends_at"?: string | null,"id"?: number,"image_url"?: string | null,"is_active"?: boolean,"link_url"?: string | null,"price_cents"?: number | null,"sort_order"?: number,"starts_at"?: string | null,"title": string
                  }
                  Update: {
                    "business_id"?: number,"compare_at_cents"?: number | null,"description"?: string | null,"ends_at"?: string | null,"id"?: number,"image_url"?: string | null,"is_active"?: boolean,"link_url"?: string | null,"price_cents"?: number | null,"sort_order"?: number,"starts_at"?: string | null,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "offers_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    }
                  ]
                },"option_groups": {
                  Row: {
                    "business_id": number,"id": number,"is_flavor_group": boolean,"is_required": boolean,"max_select": number,"min_select": number,"name": string,"sort_order": number
                  }
                  Insert: {
                    "business_id": number,"id"?: number,"is_flavor_group"?: boolean,"is_required"?: boolean,"max_select"?: number,"min_select"?: number,"name": string,"sort_order"?: number
                  }
                  Update: {
                    "business_id"?: number,"id"?: number,"is_flavor_group"?: boolean,"is_required"?: boolean,"max_select"?: number,"min_select"?: number,"name"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "option_groups_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    }
                  ]
                },"option_values": {
                  Row: {
                    "id": number,"is_available": boolean,"name": string,"option_group_id": number,"price_delta_cents": number,"sort_order": number
                  }
                  Insert: {
                    "id"?: number,"is_available"?: boolean,"name": string,"option_group_id": number,"price_delta_cents"?: number,"sort_order"?: number
                  }
                  Update: {
                    "id"?: number,"is_available"?: boolean,"name"?: string,"option_group_id"?: number,"price_delta_cents"?: number,"sort_order"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "option_values_option_group_id_fkey"
      columns: ["option_group_id"]
isOneToOne: false
      referencedRelation: "option_groups"
      referencedColumns: ["id"]
    }
                  ]
                },"order_item_options": {
                  Row: {
                    "id": number,"option_group_name": string,"option_value_name": string,"order_item_id": number,"price_delta_cents": number
                  }
                  Insert: {
                    "id"?: number,"option_group_name": string,"option_value_name": string,"order_item_id": number,"price_delta_cents"?: number
                  }
                  Update: {
                    "id"?: number,"option_group_name"?: string,"option_value_name"?: string,"order_item_id"?: number,"price_delta_cents"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_item_options_order_item_id_fkey"
      columns: ["order_item_id"]
isOneToOne: false
      referencedRelation: "order_items"
      referencedColumns: ["id"]
    }
                  ]
                },"order_items": {
                  Row: {
                    "id": number,"notes": string | null,"order_id": number,"product_id": number | null,"product_name": string,"quantity": number,"unit_price_cents": number
                  }
                  Insert: {
                    "id"?: number,"notes"?: string | null,"order_id": number,"product_id"?: number | null,"product_name": string,"quantity": number,"unit_price_cents": number
                  }
                  Update: {
                    "id"?: number,"notes"?: string | null,"order_id"?: number,"product_id"?: number | null,"product_name"?: string,"quantity"?: number,"unit_price_cents"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_items_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_items_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    }
                  ]
                },"orders": {
                  Row: {
                    "address": string | null,"address_notes": string | null,"business_id": number,"cancellation_reason": string | null,"completed_at": string | null,"confirmed_at": string | null,"created_at": string,"customer_email": string | null,"customer_id": string | null,"customer_name": string,"customer_phone": string,"delivery_fee_cents": number,"discount_cents": number,"fulfillment": Database["public"]['Enums']["order_fulfillment"],"id": number,"notes": string | null,"payment_method": Database["public"]['Enums']["payment_method"],"payment_provider": string | null,"payment_reference": string | null,"payment_status": Database["public"]['Enums']["payment_status"],"public_id": string,"status": Database["public"]['Enums']["order_status"],"subtotal_cents": number,"total_cents": number,"updated_at": string
                  }
                  Insert: {
                    "address"?: string | null,"address_notes"?: string | null,"business_id": number,"cancellation_reason"?: string | null,"completed_at"?: string | null,"confirmed_at"?: string | null,"created_at"?: string,"customer_email"?: string | null,"customer_id"?: string | null,"customer_name": string,"customer_phone": string,"delivery_fee_cents"?: number,"discount_cents"?: number,"fulfillment": Database["public"]['Enums']["order_fulfillment"],"id"?: number,"notes"?: string | null,"payment_method": Database["public"]['Enums']["payment_method"],"payment_provider"?: string | null,"payment_reference"?: string | null,"payment_status"?: Database["public"]['Enums']["payment_status"],"public_id": string,"status"?: Database["public"]['Enums']["order_status"],"subtotal_cents"?: number,"total_cents"?: number,"updated_at"?: string
                  }
                  Update: {
                    "address"?: string | null,"address_notes"?: string | null,"business_id"?: number,"cancellation_reason"?: string | null,"completed_at"?: string | null,"confirmed_at"?: string | null,"created_at"?: string,"customer_email"?: string | null,"customer_id"?: string | null,"customer_name"?: string,"customer_phone"?: string,"delivery_fee_cents"?: number,"discount_cents"?: number,"fulfillment"?: Database["public"]['Enums']["order_fulfillment"],"id"?: number,"notes"?: string | null,"payment_method"?: Database["public"]['Enums']["payment_method"],"payment_provider"?: string | null,"payment_reference"?: string | null,"payment_status"?: Database["public"]['Enums']["payment_status"],"public_id"?: string,"status"?: Database["public"]['Enums']["order_status"],"subtotal_cents"?: number,"total_cents"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "orders_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    }
                  ]
                },"plans": {
                  Row: {
                    "features": NonNullable<Json>,"id": number,"is_active": boolean,"is_featured": boolean,"monthly_equivalent_cents": number | null,"name": string,"period": Database["public"]['Enums']["plan_period"],"price_cents": number,"slug": string,"sort_order": number,"tagline": string | null
                  }
                  Insert: {
                    "features"?: NonNullable<Json>,"id"?: number,"is_active"?: boolean,"is_featured"?: boolean,"monthly_equivalent_cents"?: number | null,"name": string,"period"?: Database["public"]['Enums']["plan_period"],"price_cents": number,"slug": string,"sort_order"?: number,"tagline"?: string | null
                  }
                  Update: {
                    "features"?: NonNullable<Json>,"id"?: number,"is_active"?: boolean,"is_featured"?: boolean,"monthly_equivalent_cents"?: number | null,"name"?: string,"period"?: Database["public"]['Enums']["plan_period"],"price_cents"?: number,"slug"?: string,"sort_order"?: number,"tagline"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"product_option_groups": {
                  Row: {
                    "option_group_id": number,"product_id": number
                  }
                  Insert: {
                    "option_group_id": number,"product_id": number
                  }
                  Update: {
                    "option_group_id"?: number,"product_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "product_option_groups_option_group_id_fkey"
      columns: ["option_group_id"]
isOneToOne: false
      referencedRelation: "option_groups"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "product_option_groups_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    }
                  ]
                },"products": {
                  Row: {
                    "business_id": number,"compare_at_cents": number,"created_at": string,"description": string | null,"id": number,"image_url": string | null,"is_available": boolean,"is_featured": boolean,"legacy_wp_id": number | null,"menu_category_id": number | null,"name": string,"price_cents": number,"sort_order": number,"source": string | null,"updated_at": string
                  }
                  Insert: {
                    "business_id": number,"compare_at_cents"?: number,"created_at"?: string,"description"?: string | null,"id"?: number,"image_url"?: string | null,"is_available"?: boolean,"is_featured"?: boolean,"legacy_wp_id"?: number | null,"menu_category_id"?: number | null,"name": string,"price_cents"?: number,"sort_order"?: number,"source"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "business_id"?: number,"compare_at_cents"?: number,"created_at"?: string,"description"?: string | null,"id"?: number,"image_url"?: string | null,"is_available"?: boolean,"is_featured"?: boolean,"legacy_wp_id"?: number | null,"menu_category_id"?: number | null,"name"?: string,"price_cents"?: number,"sort_order"?: number,"source"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "products_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "products_menu_category_id_fkey"
      columns: ["menu_category_id"]
isOneToOne: false
      referencedRelation: "menu_categories"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"full_name": string | null,"id": string,"phone": string | null,"role": Database["public"]['Enums']["profile_role"],"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"full_name"?: string | null,"id": string,"phone"?: string | null,"role"?: Database["public"]['Enums']["profile_role"],"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"full_name"?: string | null,"id"?: string,"phone"?: string | null,"role"?: Database["public"]['Enums']["profile_role"],"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"quote_requests": {
                  Row: {
                    "business_id": number,"created_at": string,"customer_email": string | null,"customer_name": string,"customer_phone": string,"id": number,"items": Json | null,"message": string | null,"status": Database["public"]['Enums']["quote_status"]
                  }
                  Insert: {
                    "business_id": number,"created_at"?: string,"customer_email"?: string | null,"customer_name": string,"customer_phone": string,"id"?: number,"items"?: Json | null,"message"?: string | null,"status"?: Database["public"]['Enums']["quote_status"]
                  }
                  Update: {
                    "business_id"?: number,"created_at"?: string,"customer_email"?: string | null,"customer_name"?: string,"customer_phone"?: string,"id"?: number,"items"?: Json | null,"message"?: string | null,"status"?: Database["public"]['Enums']["quote_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "quote_requests_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    }
                  ]
                },"subscriptions": {
                  Row: {
                    "business_id": number,"cancelled_at": string | null,"created_at": string,"current_period_end": string | null,"id": number,"plan_id": number,"provider": string | null,"provider_reference": string | null,"started_at": string | null,"status": Database["public"]['Enums']["subscription_status"]
                  }
                  Insert: {
                    "business_id": number,"cancelled_at"?: string | null,"created_at"?: string,"current_period_end"?: string | null,"id"?: number,"plan_id": number,"provider"?: string | null,"provider_reference"?: string | null,"started_at"?: string | null,"status"?: Database["public"]['Enums']["subscription_status"]
                  }
                  Update: {
                    "business_id"?: number,"cancelled_at"?: string | null,"created_at"?: string,"current_period_end"?: string | null,"id"?: number,"plan_id"?: number,"provider"?: string | null,"provider_reference"?: string | null,"started_at"?: string | null,"status"?: Database["public"]['Enums']["subscription_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "subscriptions_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "subscriptions_plan_id_fkey"
      columns: ["plan_id"]
isOneToOne: false
      referencedRelation: "plans"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "get_business_menu":
{ Args: { "p_business_id": number }; Returns: Json
                           },
"immutable_unaccent":
{ Args: { "": string }; Returns: string
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"list_businesses":
{ Args: { "p_city_id": number,"p_group_slugs"?: (string)[],"p_limit"?: number,"p_offset"?: number }; Returns: {
              "custom_slug": string,"description": string,"groups": (string)[],"id": number,"logo_url": string,"name": string,"slug": string
            }[]
                           },
"manages_business":
{ Args: { "p_business_id": number }; Returns: boolean
                           },
"manages_product":
{ Args: { "p_product_id": number }; Returns: boolean
                           },
"manages_storage_path":
{ Args: { "p_bucket": string,"p_name": string }; Returns: boolean
                           },
"refresh_business_search":
{ Args: { "p_business_id": number }; Returns: undefined
                           },
"search_businesses":
{ Args: { "p_city_id"?: number,"p_group_slug"?: string,"p_limit"?: number,"p_offset"?: number,"p_query": string }; Returns: {
              "city_slug": string,"custom_slug": string,"description": string,"groups": (string)[],"has_menu": boolean,"id": number,"logo_url": string,"name": string,"rank": number,"slug": string
            }[]
                           },
"show_limit":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"show_trgm":
{ Args: { "": string }; Returns: (string)[]
                           },
"unaccent":
{ Args: { "": string }; Returns: string
                           }
          }
          Enums: {
            "business_status": "draft"|"pending"|"active"|"suspended","fulfillment_mode": "delivery"|"pickup","member_role": "owner"|"manager","order_fulfillment": "delivery"|"pickup","order_status": "pending"|"confirmed"|"preparing"|"out_for_delivery"|"ready_for_pickup"|"completed"|"cancelled","payment_method": "pix"|"cash"|"card_on_delivery"|"card_online","payment_status": "pending"|"paid"|"failed"|"refunded","plan_period": "month"|"year","profile_role": "customer"|"merchant"|"admin","quote_status": "new"|"contacted"|"won"|"lost","subscription_status": "pending"|"active"|"past_due"|"cancelled"|"expired"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "business_status": ["draft", "pending", "active", "suspended"],"fulfillment_mode": ["delivery", "pickup"],"member_role": ["owner", "manager"],"order_fulfillment": ["delivery", "pickup"],"order_status": ["pending", "confirmed", "preparing", "out_for_delivery", "ready_for_pickup", "completed", "cancelled"],"payment_method": ["pix", "cash", "card_on_delivery", "card_online"],"payment_status": ["pending", "paid", "failed", "refunded"],"plan_period": ["month", "year"],"profile_role": ["customer", "merchant", "admin"],"quote_status": ["new", "contacted", "won", "lost"],"subscription_status": ["pending", "active", "past_due", "cancelled", "expired"]
          }
        }
} as const
