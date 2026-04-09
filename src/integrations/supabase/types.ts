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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      planes: {
        Row: {
          creado_en: string | null
          dias_generados: number | null
          id: string
          ingredientes: string | null
          plan_html: string | null
          plan_json: Json | null
          public_token: string | null
          recetas_ids: string[] | null
          semanas: number | null
          usuario_id: string
        }
        Insert: {
          creado_en?: string | null
          dias_generados?: number | null
          id?: string
          ingredientes?: string | null
          plan_html?: string | null
          plan_json?: Json | null
          public_token?: string | null
          recetas_ids?: string[] | null
          semanas?: number | null
          usuario_id: string
        }
        Update: {
          creado_en?: string | null
          dias_generados?: number | null
          id?: string
          ingredientes?: string | null
          plan_html?: string | null
          plan_json?: Json | null
          public_token?: string | null
          recetas_ids?: string[] | null
          semanas?: number | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "planes_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      preferencias: {
        Row: {
          altura_cm: number | null
          brazo_cm: number | null
          cadera_cm: number | null
          calorias_objetivo: number | null
          carbos_g: number | null
          cintura_cm: number | null
          comidas: string[] | null
          creado_en: string | null
          dias_ejercicio: number | null
          duracion_ejercicio: string | null
          edad: number | null
          enfermedad_renal: boolean | null
          equipamiento: string[] | null
          fase_entrenamiento: string | null
          grasa_corporal: number | null
          grasas_g: number | null
          hba1c: number | null
          horario_entreno: string | null
          horas_sueno: number | null
          id: string
          medicamentos: string[] | null
          meta_sodio: string | null
          nivel_culinario: string | null
          nivel_estres: string | null
          nivel_experiencia: string | null
          objetivo: string | null
          personas: number | null
          peso_kg: number | null
          presion_diastolica: number | null
          presion_sistolica: number | null
          proteina_g: number | null
          resistencia_insulina: string | null
          restricciones: string[] | null
          sexo: string | null
          tdee: number | null
          tiempo_cocina: string | null
          tipo_diabetes: string | null
          tipo_ejercicio: string | null
          tmb: number | null
          usa_insulina: boolean | null
          usuario_id: string
        }
        Insert: {
          altura_cm?: number | null
          brazo_cm?: number | null
          cadera_cm?: number | null
          calorias_objetivo?: number | null
          carbos_g?: number | null
          cintura_cm?: number | null
          comidas?: string[] | null
          creado_en?: string | null
          dias_ejercicio?: number | null
          duracion_ejercicio?: string | null
          edad?: number | null
          enfermedad_renal?: boolean | null
          equipamiento?: string[] | null
          fase_entrenamiento?: string | null
          grasa_corporal?: number | null
          grasas_g?: number | null
          hba1c?: number | null
          horario_entreno?: string | null
          horas_sueno?: number | null
          id?: string
          medicamentos?: string[] | null
          meta_sodio?: string | null
          nivel_culinario?: string | null
          nivel_estres?: string | null
          nivel_experiencia?: string | null
          objetivo?: string | null
          personas?: number | null
          peso_kg?: number | null
          presion_diastolica?: number | null
          presion_sistolica?: number | null
          proteina_g?: number | null
          resistencia_insulina?: string | null
          restricciones?: string[] | null
          sexo?: string | null
          tdee?: number | null
          tiempo_cocina?: string | null
          tipo_diabetes?: string | null
          tipo_ejercicio?: string | null
          tmb?: number | null
          usa_insulina?: boolean | null
          usuario_id: string
        }
        Update: {
          altura_cm?: number | null
          brazo_cm?: number | null
          cadera_cm?: number | null
          calorias_objetivo?: number | null
          carbos_g?: number | null
          cintura_cm?: number | null
          comidas?: string[] | null
          creado_en?: string | null
          dias_ejercicio?: number | null
          duracion_ejercicio?: string | null
          edad?: number | null
          enfermedad_renal?: boolean | null
          equipamiento?: string[] | null
          fase_entrenamiento?: string | null
          grasa_corporal?: number | null
          grasas_g?: number | null
          hba1c?: number | null
          horario_entreno?: string | null
          horas_sueno?: number | null
          id?: string
          medicamentos?: string[] | null
          meta_sodio?: string | null
          nivel_culinario?: string | null
          nivel_estres?: string | null
          nivel_experiencia?: string | null
          objetivo?: string | null
          personas?: number | null
          peso_kg?: number | null
          presion_diastolica?: number | null
          presion_sistolica?: number | null
          proteina_g?: number | null
          resistencia_insulina?: string | null
          restricciones?: string[] | null
          sexo?: string | null
          tdee?: number | null
          tiempo_cocina?: string | null
          tipo_diabetes?: string | null
          tipo_ejercicio?: string | null
          tmb?: number | null
          usa_insulina?: boolean | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "preferencias_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          altura_cm: number | null
          ciudad: string | null
          creado_en: string | null
          dispositivo: string | null
          email: string | null
          etiqueta: string | null
          fecha_nacimiento: string | null
          foto_perfil: string | null
          id: string
          ip_pais: string | null
          nombre: string | null
          pais: string | null
          peso_kg: number | null
          problemas_salud: string[] | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          suscripcion_activa: boolean | null
          suscripcion_hasta: string | null
          telefono: string | null
          telegram_id: number | null
          ultima_conexion: string | null
        }
        Insert: {
          altura_cm?: number | null
          ciudad?: string | null
          creado_en?: string | null
          dispositivo?: string | null
          email?: string | null
          etiqueta?: string | null
          fecha_nacimiento?: string | null
          foto_perfil?: string | null
          id: string
          ip_pais?: string | null
          nombre?: string | null
          pais?: string | null
          peso_kg?: number | null
          problemas_salud?: string[] | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          suscripcion_activa?: boolean | null
          suscripcion_hasta?: string | null
          telefono?: string | null
          telegram_id?: number | null
          ultima_conexion?: string | null
        }
        Update: {
          altura_cm?: number | null
          ciudad?: string | null
          creado_en?: string | null
          dispositivo?: string | null
          email?: string | null
          etiqueta?: string | null
          fecha_nacimiento?: string | null
          foto_perfil?: string | null
          id?: string
          ip_pais?: string | null
          nombre?: string | null
          pais?: string | null
          peso_kg?: number | null
          problemas_salud?: string[] | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          suscripcion_activa?: boolean | null
          suscripcion_hasta?: string | null
          telefono?: string | null
          telegram_id?: number | null
          ultima_conexion?: string | null
        }
        Relationships: []
      }
      recetas_catalogo: {
        Row: {
          creado_en: string | null
          hash: string | null
          id: string
          ingredientes_principales: string[] | null
          nombre: string
          objetivo: string | null
          tipo_proteina: string | null
          ultima_vez: string | null
          usuario_id: string
          veces_generada: number | null
        }
        Insert: {
          creado_en?: string | null
          hash?: string | null
          id?: string
          ingredientes_principales?: string[] | null
          nombre: string
          objetivo?: string | null
          tipo_proteina?: string | null
          ultima_vez?: string | null
          usuario_id: string
          veces_generada?: number | null
        }
        Update: {
          creado_en?: string | null
          hash?: string | null
          id?: string
          ingredientes_principales?: string[] | null
          nombre?: string
          objetivo?: string | null
          tipo_proteina?: string | null
          ultima_vez?: string | null
          usuario_id?: string
          veces_generada?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "recetas_catalogo_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sesiones: {
        Row: {
          ciudad: string | null
          dispositivo: string | null
          fin: string | null
          id: string
          inicio: string | null
          ip: string | null
          navegador: string | null
          pais: string | null
          usuario_id: string
        }
        Insert: {
          ciudad?: string | null
          dispositivo?: string | null
          fin?: string | null
          id?: string
          inicio?: string | null
          ip?: string | null
          navegador?: string | null
          pais?: string | null
          usuario_id: string
        }
        Update: {
          ciudad?: string | null
          dispositivo?: string | null
          fin?: string | null
          id?: string
          inicio?: string | null
          ip?: string | null
          navegador?: string | null
          pais?: string | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sesiones_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      token_usage: {
        Row: {
          costo_usd: number | null
          creado_en: string | null
          id: string
          modelo: string | null
          plan_id: string | null
          tokens_input: number | null
          tokens_output: number | null
          tokens_total: number | null
          usuario_id: string
        }
        Insert: {
          costo_usd?: number | null
          creado_en?: string | null
          id?: string
          modelo?: string | null
          plan_id?: string | null
          tokens_input?: number | null
          tokens_output?: number | null
          tokens_total?: number | null
          usuario_id: string
        }
        Update: {
          costo_usd?: number | null
          creado_en?: string | null
          id?: string
          modelo?: string | null
          plan_id?: string | null
          tokens_input?: number | null
          tokens_output?: number | null
          tokens_total?: number | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "token_usage_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "planes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "token_usage_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "cliente"
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
      app_role: ["admin", "cliente"],
    },
  },
} as const
