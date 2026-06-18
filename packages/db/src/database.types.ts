export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      api_keys: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          key_hash: string
          key_prefix: string
          label: string | null
          last_used_at: string | null
          scopes: string[]
          store_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_hash: string
          key_prefix: string
          label?: string | null
          last_used_at?: string | null
          scopes?: string[]
          store_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_hash?: string
          key_prefix?: string
          label?: string | null
          last_used_at?: string | null
          scopes?: string[]
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "service_details_view"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "api_keys_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      beta_signups: {
        Row: {
          created_at: string
          email: string
          id: string
          source: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          source?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          source?: string | null
        }
        Relationships: []
      }
      blog_authors: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          id: string
          name: string
          store_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          id?: string
          name: string
          store_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          id?: string
          name?: string
          store_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_authors_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "service_details_view"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "blog_authors_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_authors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          author_id: string | null
          content: string
          cover_image: string | null
          created_at: string
          excerpt: string | null
          id: string
          is_published: boolean
          metadata: Json
          published_at: string | null
          reading_time_minutes: number | null
          slug: string
          store_id: string
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          content?: string
          cover_image?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_published?: boolean
          metadata?: Json
          published_at?: string | null
          reading_time_minutes?: number | null
          slug: string
          store_id: string
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          content?: string
          cover_image?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_published?: boolean
          metadata?: Json
          published_at?: string | null
          reading_time_minutes?: number | null
          slug?: string
          store_id?: string
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "blog_authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_posts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "service_details_view"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "blog_posts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_products: {
        Row: {
          collection_id: string
          created_at: string | null
          position: number | null
          product_id: string
        }
        Insert: {
          collection_id: string
          created_at?: string | null
          position?: number | null
          product_id: string
        }
        Update: {
          collection_id?: string
          created_at?: string | null
          position?: number | null
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_products_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          metadata: Json | null
          name: string
          position: number | null
          slug: string
          store_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          metadata?: Json | null
          name: string
          position?: number | null
          slug: string
          store_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          metadata?: Json | null
          name?: string
          position?: number | null
          slug?: string
          store_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collections_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "service_details_view"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "collections_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          addresses: Json | null
          company: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          metadata: Json | null
          mpesa_phone: string | null
          notes: string | null
          order_count: number | null
          phone: string | null
          store_id: string
          tags: string[] | null
          total_spent: number | null
          updated_at: string | null
          whatsapp_number: string | null
        }
        Insert: {
          addresses?: Json | null
          company?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          metadata?: Json | null
          mpesa_phone?: string | null
          notes?: string | null
          order_count?: number | null
          phone?: string | null
          store_id: string
          tags?: string[] | null
          total_spent?: number | null
          updated_at?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          addresses?: Json | null
          company?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          metadata?: Json | null
          mpesa_phone?: string | null
          notes?: string | null
          order_count?: number | null
          phone?: string | null
          store_id?: string
          tags?: string[] | null
          total_spent?: number | null
          updated_at?: string | null
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "service_details_view"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "customers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_codes: {
        Row: {
          code: string
          created_at: string | null
          ends_at: string | null
          id: string
          is_active: boolean | null
          minimum_purchase_amount: number | null
          starts_at: string | null
          store_id: string
          type: string
          updated_at: string | null
          usage_count: number | null
          usage_limit: number | null
          value: number
        }
        Insert: {
          code: string
          created_at?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean | null
          minimum_purchase_amount?: number | null
          starts_at?: string | null
          store_id: string
          type: string
          updated_at?: string | null
          usage_count?: number | null
          usage_limit?: number | null
          value: number
        }
        Update: {
          code?: string
          created_at?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean | null
          minimum_purchase_amount?: number | null
          starts_at?: string | null
          store_id?: string
          type?: string
          updated_at?: string | null
          usage_count?: number | null
          usage_limit?: number | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "discount_codes_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "service_details_view"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "discount_codes_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      docs_pages: {
        Row: {
          data: Json
          id: string
          position: number
          updated_at: string
        }
        Insert: {
          data: Json
          id: string
          position?: number
          updated_at?: string
        }
        Update: {
          data?: Json
          id?: string
          position?: number
          updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string | null
          id: string
          image_url: string | null
          metadata: Json | null
          order_id: string
          price: number
          product_id: string | null
          quantity: number
          sku: string | null
          title: string
          total: number
          variant_id: string | null
          variant_title: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_url?: string | null
          metadata?: Json | null
          order_id: string
          price: number
          product_id?: string | null
          quantity: number
          sku?: string | null
          title: string
          total: number
          variant_id?: string | null
          variant_title?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          image_url?: string | null
          metadata?: Json | null
          order_id?: string
          price?: number
          product_id?: string | null
          quantity?: number
          sku?: string | null
          title?: string
          total?: number
          variant_id?: string | null
          variant_title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          billing_address: Json | null
          created_at: string | null
          currency: string
          customer_email: string | null
          customer_id: string | null
          customer_phone: string | null
          discount: number | null
          fulfillment_status: string | null
          id: string
          metadata: Json | null
          notes: string | null
          order_number: string
          shipping: number | null
          shipping_address: Json | null
          source: string | null
          status: string
          store_id: string
          subtotal: number
          tags: string[] | null
          tax: number | null
          total: number
          updated_at: string | null
        }
        Insert: {
          billing_address?: Json | null
          created_at?: string | null
          currency?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_phone?: string | null
          discount?: number | null
          fulfillment_status?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          order_number: string
          shipping?: number | null
          shipping_address?: Json | null
          source?: string | null
          status?: string
          store_id: string
          subtotal?: number
          tags?: string[] | null
          tax?: number | null
          total: number
          updated_at?: string | null
        }
        Update: {
          billing_address?: Json | null
          created_at?: string | null
          currency?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_phone?: string | null
          discount?: number | null
          fulfillment_status?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          order_number?: string
          shipping?: number | null
          shipping_address?: Json | null
          source?: string | null
          status?: string
          store_id?: string
          subtotal?: number
          tags?: string[] | null
          tax?: number | null
          total?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "service_details_view"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      org_integrations: {
        Row: {
          config: Json
          created_at: string
          id: string
          is_active: boolean
          org_id: string
          provider: string
          updated_at: string
          webhook_secret: string | null
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          org_id: string
          provider: string
          updated_at?: string
          webhook_secret?: string | null
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          org_id?: string
          provider?: string
          updated_at?: string
          webhook_secret?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_integrations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      org_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string | null
          expires_at: string | null
          id: string
          invited_by: string | null
          org_id: string | null
          role: string | null
          token: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email?: string | null
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          org_id?: string | null
          role?: string | null
          token?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string | null
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          org_id?: string | null
          role?: string | null
          token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_invites_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      org_members: {
        Row: {
          created_at: string
          id: string
          org_id: string
          permissions: Json
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          permissions?: Json
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          permissions?: Json
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      orgs: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          owner_id: string
          public_id: string
          settings: Json
          slug: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          owner_id: string
          public_id: string
          settings?: Json
          slug: string
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          owner_id?: string
          public_id?: string
          settings?: Json
          slug?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orgs_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_links: {
        Row: {
          amount: number
          created_at: string | null
          currency: string
          description: string | null
          expires_at: string | null
          id: string
          metadata: Json | null
          order_id: string | null
          paid_at: string | null
          payment_provider: string | null
          status: string
          store_id: string
          token: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency: string
          description?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          order_id?: string | null
          paid_at?: string | null
          payment_provider?: string | null
          status?: string
          store_id: string
          token?: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string
          description?: string | null
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          order_id?: string | null
          paid_at?: string | null
          payment_provider?: string | null
          status?: string
          store_id?: string
          token?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_links_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_links_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "service_details_view"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "payment_links_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          amount: number
          created_at: string | null
          currency: string
          error_message: string | null
          id: string
          metadata: Json | null
          order_id: string
          provider: string
          status: string
          store_id: string
          transaction_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          order_id: string
          provider: string
          status?: string
          store_id: string
          transaction_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          order_id?: string
          provider?: string
          status?: string
          store_id?: string
          transaction_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "service_details_view"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "payment_transactions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          body: string | null
          created_at: string
          customer_id: string | null
          helpful_count: number
          id: string
          is_published: boolean
          is_verified_purchase: boolean
          order_id: string | null
          product_id: string
          rating: number
          store_id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          customer_id?: string | null
          helpful_count?: number
          id?: string
          is_published?: boolean
          is_verified_purchase?: boolean
          order_id?: string | null
          product_id: string
          rating: number
          store_id: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          body?: string | null
          created_at?: string
          customer_id?: string | null
          helpful_count?: number
          id?: string
          is_published?: boolean
          is_verified_purchase?: boolean
          order_id?: string | null
          product_id?: string
          rating?: number
          store_id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "service_details_view"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "product_reviews_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          barcode: string | null
          compare_at_price: number | null
          cost_per_item: number | null
          created_at: string | null
          id: string
          image_url: string | null
          inventory_quantity: number | null
          is_active: boolean | null
          name: string
          options: Json
          position: number | null
          price: number
          product_id: string
          sku: string | null
          updated_at: string | null
          weight: number | null
        }
        Insert: {
          barcode?: string | null
          compare_at_price?: number | null
          cost_per_item?: number | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          inventory_quantity?: number | null
          is_active?: boolean | null
          name: string
          options?: Json
          position?: number | null
          price: number
          product_id: string
          sku?: string | null
          updated_at?: string | null
          weight?: number | null
        }
        Update: {
          barcode?: string | null
          compare_at_price?: number | null
          cost_per_item?: number | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          inventory_quantity?: number | null
          is_active?: boolean | null
          name?: string
          options?: Json
          position?: number | null
          price?: number
          product_id?: string
          sku?: string | null
          updated_at?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          barcode: string | null
          compare_at_price: number | null
          cost_per_item: number | null
          created_at: string | null
          description: string | null
          id: string
          images: Json | null
          inventory_quantity: number | null
          is_active: boolean | null
          metadata: Json | null
          name: string
          price: number
          requires_shipping: boolean | null
          sku: string | null
          slug: string
          store_id: string
          track_inventory: boolean | null
          updated_at: string | null
          weight: number | null
        }
        Insert: {
          barcode?: string | null
          compare_at_price?: number | null
          cost_per_item?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          images?: Json | null
          inventory_quantity?: number | null
          is_active?: boolean | null
          metadata?: Json | null
          name: string
          price: number
          requires_shipping?: boolean | null
          sku?: string | null
          slug: string
          store_id: string
          track_inventory?: boolean | null
          updated_at?: string | null
          weight?: number | null
        }
        Update: {
          barcode?: string | null
          compare_at_price?: number | null
          cost_per_item?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          images?: Json | null
          inventory_quantity?: number | null
          is_active?: boolean | null
          metadata?: Json | null
          name?: string
          price?: number
          requires_shipping?: boolean | null
          sku?: string | null
          slug?: string
          store_id?: string
          track_inventory?: boolean | null
          updated_at?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "service_details_view"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      service_packages: {
        Row: {
          created_at: string | null
          deliverables: string[] | null
          delivery_days: number | null
          description: string | null
          id: string
          is_featured: boolean | null
          name: string
          price: number
          revisions: number | null
          service_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deliverables?: string[] | null
          delivery_days?: number | null
          description?: string | null
          id?: string
          is_featured?: boolean | null
          name: string
          price: number
          revisions?: number | null
          service_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deliverables?: string[] | null
          delivery_days?: number | null
          description?: string | null
          id?: string
          is_featured?: boolean | null
          name?: string
          price?: number
          revisions?: number | null
          service_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_packages_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "service_details_view"
            referencedColumns: ["service_id"]
          },
          {
            foreignKeyName: "service_packages_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          availability: string | null
          compare_at_price: number | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          item_type: string
          media: Json | null
          metadata: Json | null
          name: string
          price: number
          sku: string | null
          slug: string
          store_id: string | null
          updated_at: string | null
        }
        Insert: {
          availability?: string | null
          compare_at_price?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          item_type: string
          media?: Json | null
          metadata?: Json | null
          name: string
          price: number
          sku?: string | null
          slug: string
          store_id?: string | null
          updated_at?: string | null
        }
        Update: {
          availability?: string | null
          compare_at_price?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          item_type?: string
          media?: Json | null
          metadata?: Json | null
          name?: string
          price?: number
          sku?: string | null
          slug?: string
          store_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "service_details_view"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "services_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_analytics: {
        Row: {
          country_code: string | null
          created_at: string
          device_type: string | null
          event: Database["public"]["Enums"]["analytics_event_type"]
          id: string
          order_id: string | null
          product_id: string | null
          referrer: string | null
          session_id: string | null
          store_id: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          country_code?: string | null
          created_at?: string
          device_type?: string | null
          event: Database["public"]["Enums"]["analytics_event_type"]
          id?: string
          order_id?: string | null
          product_id?: string | null
          referrer?: string | null
          session_id?: string | null
          store_id: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          country_code?: string | null
          created_at?: string
          device_type?: string | null
          event?: Database["public"]["Enums"]["analytics_event_type"]
          id?: string
          order_id?: string | null
          product_id?: string | null
          referrer?: string | null
          session_id?: string | null
          store_id?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_analytics_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_analytics_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_analytics_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "service_details_view"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "store_analytics_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_integrations: {
        Row: {
          config: Json
          created_at: string | null
          id: string
          inherited_from_org: boolean
          is_active: boolean | null
          provider: string
          store_id: string
          updated_at: string | null
          webhook_secret: string | null
        }
        Insert: {
          config?: Json
          created_at?: string | null
          id?: string
          inherited_from_org?: boolean
          is_active?: boolean | null
          provider: string
          store_id: string
          updated_at?: string | null
          webhook_secret?: string | null
        }
        Update: {
          config?: Json
          created_at?: string | null
          id?: string
          inherited_from_org?: boolean
          is_active?: boolean | null
          provider?: string
          store_id?: string
          updated_at?: string | null
          webhook_secret?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_integrations_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "service_details_view"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "store_integrations_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: string
          store_id: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role: string
          store_id: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: string
          store_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_invites_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "service_details_view"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "store_invites_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_members: {
        Row: {
          created_at: string | null
          id: string
          permissions: Json | null
          role: string
          store_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          permissions?: Json | null
          role: string
          store_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          permissions?: Json | null
          role?: string
          store_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_members_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "service_details_view"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "store_members_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      store_subscriptions: {
        Row: {
          amount: number
          created_at: string | null
          currency: string
          id: string
          paystack_customer_code: string | null
          paystack_email_token: string | null
          paystack_paid_at: string | null
          paystack_reference: string | null
          paystack_subscription_code: string | null
          period_end: string | null
          period_start: string | null
          plan: string | null
          provider: string | null
          status: string
          store_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string
          id?: string
          paystack_customer_code?: string | null
          paystack_email_token?: string | null
          paystack_paid_at?: string | null
          paystack_reference?: string | null
          paystack_subscription_code?: string | null
          period_end?: string | null
          period_start?: string | null
          plan?: string | null
          provider?: string | null
          status?: string
          store_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string
          id?: string
          paystack_customer_code?: string | null
          paystack_email_token?: string | null
          paystack_paid_at?: string | null
          paystack_reference?: string | null
          paystack_subscription_code?: string | null
          period_end?: string | null
          period_start?: string | null
          plan?: string | null
          provider?: string | null
          status?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_subscriptions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "service_details_view"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "store_subscriptions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_themes: {
        Row: {
          accent_color: string
          background_color: string
          body_font: string
          border_radius: string
          created_at: string | null
          dark_background_color: string
          dark_foreground_color: string
          dark_muted_color: string
          dark_primary_color: string
          font_scale: string
          foreground_color: string
          heading_font: string
          id: string
          muted_color: string
          primary_color: string
          puck_content: Json | null
          puck_pages: Json | null
          secondary_color: string
          store_id: string
          theme_id: string
          updated_at: string | null
        }
        Insert: {
          accent_color?: string
          background_color?: string
          body_font?: string
          border_radius?: string
          created_at?: string | null
          dark_background_color?: string
          dark_foreground_color?: string
          dark_muted_color?: string
          dark_primary_color?: string
          font_scale?: string
          foreground_color?: string
          heading_font?: string
          id?: string
          muted_color?: string
          primary_color?: string
          puck_content?: Json | null
          puck_pages?: Json | null
          secondary_color?: string
          store_id: string
          theme_id?: string
          updated_at?: string | null
        }
        Update: {
          accent_color?: string
          background_color?: string
          body_font?: string
          border_radius?: string
          created_at?: string | null
          dark_background_color?: string
          dark_foreground_color?: string
          dark_muted_color?: string
          dark_primary_color?: string
          font_scale?: string
          foreground_color?: string
          heading_font?: string
          id?: string
          muted_color?: string
          primary_color?: string
          puck_content?: Json | null
          puck_pages?: Json | null
          secondary_color?: string
          store_id?: string
          theme_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_themes_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "service_details_view"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "store_themes_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_visits: {
        Row: {
          store_id: string
          user_id: string
          visited_at: string
        }
        Insert: {
          store_id: string
          user_id: string
          visited_at?: string
        }
        Update: {
          store_id?: string
          user_id?: string
          visited_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_visits_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "service_details_view"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "store_visits_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          created_at: string | null
          currency: string
          custom_domain: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_pro: boolean
          logo_url: string | null
          name: string
          org_id: string | null
          owner_id: string
          pro_expires_at: string | null
          pro_since: string | null
          settings: Json | null
          slug: string
          timezone: string | null
          type: string
          updated_at: string | null
          views: number | null
        }
        Insert: {
          created_at?: string | null
          currency?: string
          custom_domain?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_pro?: boolean
          logo_url?: string | null
          name: string
          org_id?: string | null
          owner_id: string
          pro_expires_at?: string | null
          pro_since?: string | null
          settings?: Json | null
          slug: string
          timezone?: string | null
          type?: string
          updated_at?: string | null
          views?: number | null
        }
        Update: {
          created_at?: string | null
          currency?: string
          custom_domain?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_pro?: boolean
          logo_url?: string | null
          name?: string
          org_id?: string | null
          owner_id?: string
          pro_expires_at?: string | null
          pro_since?: string | null
          settings?: Json | null
          slug?: string
          timezone?: string | null
          type?: string
          updated_at?: string | null
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stores_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stores_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      trading_apps: {
        Row: {
          affiliate_link: string | null
          brand_name: string
          created_at: string | null
          custom_domain: string | null
          deriv_app_id: string
          deriv_oauth_scopes: string | null
          deriv_redirect_uri: string
          enabled_apps: Json | null
          faq_affiliate_link: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          org_id: string | null
          primary_color: string | null
          slug: string
          support_email: string | null
          support_whatsapp: string | null
          updated_at: string | null
        }
        Insert: {
          affiliate_link?: string | null
          brand_name: string
          created_at?: string | null
          custom_domain?: string | null
          deriv_app_id: string
          deriv_oauth_scopes?: string | null
          deriv_redirect_uri: string
          enabled_apps?: Json | null
          faq_affiliate_link?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          org_id?: string | null
          primary_color?: string | null
          slug: string
          support_email?: string | null
          support_whatsapp?: string | null
          updated_at?: string | null
        }
        Update: {
          affiliate_link?: string | null
          brand_name?: string
          created_at?: string | null
          custom_domain?: string | null
          deriv_app_id?: string
          deriv_oauth_scopes?: string | null
          deriv_redirect_uri?: string
          enabled_apps?: Json | null
          faq_affiliate_link?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          org_id?: string | null
          primary_color?: string | null
          slug?: string
          support_email?: string | null
          support_whatsapp?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trading_apps_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "orgs"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string | null
          role: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          id: string
          name?: string | null
          role?: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string | null
          role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          event_type: string
          headers: Json | null
          id: string
          payload: Json
          processed_at: string | null
          provider: string
          status: string
          store_id: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          event_type: string
          headers?: Json | null
          id?: string
          payload: Json
          processed_at?: string | null
          provider: string
          status: string
          store_id?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          event_type?: string
          headers?: Json | null
          id?: string
          payload?: Json
          processed_at?: string | null
          provider?: string
          status?: string
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_logs_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "service_details_view"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "webhook_logs_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_conversations: {
        Row: {
          created_at: string | null
          customer_id: string | null
          id: string
          last_message_at: string | null
          metadata: Json | null
          phone_number: string
          status: string | null
          store_id: string
          updated_at: string | null
          wa_conversation_id: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          id?: string
          last_message_at?: string | null
          metadata?: Json | null
          phone_number: string
          status?: string | null
          store_id: string
          updated_at?: string | null
          wa_conversation_id?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          id?: string
          last_message_at?: string | null
          metadata?: Json | null
          phone_number?: string
          status?: string | null
          store_id?: string
          updated_at?: string | null
          wa_conversation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "service_details_view"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          content: string | null
          conversation_id: string
          created_at: string | null
          delivered_at: string | null
          direction: string
          id: string
          media_url: string | null
          message_type: string
          metadata: Json | null
          order_id: string | null
          read_at: string | null
          sent_at: string | null
          status: string | null
          wa_message_id: string | null
        }
        Insert: {
          content?: string | null
          conversation_id: string
          created_at?: string | null
          delivered_at?: string | null
          direction: string
          id?: string
          media_url?: string | null
          message_type: string
          metadata?: Json | null
          order_id?: string | null
          read_at?: string | null
          sent_at?: string | null
          status?: string | null
          wa_message_id?: string | null
        }
        Update: {
          content?: string | null
          conversation_id?: string
          created_at?: string | null
          delivered_at?: string | null
          direction?: string
          id?: string
          media_url?: string | null
          message_type?: string
          metadata?: Json | null
          order_id?: string | null
          read_at?: string | null
          sent_at?: string | null
          status?: string | null
          wa_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      wishlists: {
        Row: {
          created_at: string | null
          customer_id: string
          id: string
          product_id: string
          store_id: string
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          id?: string
          product_id: string
          store_id: string
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          id?: string
          product_id?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlists_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlists_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlists_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "service_details_view"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "wishlists_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      service_details_view: {
        Row: {
          availability: string | null
          base_price: number | null
          compare_at_price: number | null
          deliverables: string[] | null
          delivery_days: number | null
          is_active: boolean | null
          is_featured: boolean | null
          item_type: string | null
          media: Json | null
          metadata: Json | null
          package_description: string | null
          package_id: string | null
          package_name: string | null
          package_price: number | null
          revisions: number | null
          service_description: string | null
          service_id: string | null
          service_name: string | null
          service_slug: string | null
          sku: string | null
          store_id: string | null
          store_name: string | null
          store_slug: string | null
        }
        Relationships: []
      }
      store_funnel_7d: {
        Row: {
          add_to_carts: number | null
          checkouts: number | null
          orders: number | null
          store_id: string | null
          views: number | null
        }
        Relationships: [
          {
            foreignKeyName: "store_analytics_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "service_details_view"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "store_analytics_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_top_product_month: {
        Row: {
          image_url: string | null
          name: string | null
          product_id: string | null
          revenue: number | null
          store_id: string | null
          units_sold: number | null
        }
        Relationships: [
          {
            foreignKeyName: "store_analytics_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_analytics_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "service_details_view"
            referencedColumns: ["store_id"]
          },
          {
            foreignKeyName: "store_analytics_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      auth0_uid: { Args: never; Returns: string }
      generate_order_number: { Args: { store_uuid: string }; Returns: string }
      get_store_analytics: {
        Args: { p_end: string; p_start: string; p_store_id: string }
        Returns: Json
      }
      increment_store_views: { Args: { store_id: string }; Returns: undefined }
    }
    Enums: {
      analytics_event_type:
        | "view"
        | "add_to_cart"
        | "checkout_started"
        | "order_placed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      analytics_event_type: [
        "view",
        "add_to_cart",
        "checkout_started",
        "order_placed",
      ],
    },
  },
} as const
