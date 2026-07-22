import { createClient } from './server'

export async function testConnection(): Promise<{ ok: boolean; message: string }> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from('workspaces').select('id').limit(1)

    if (error) {
      return { ok: false, message: `Supabase error: ${error.message} (code: ${error.code})` }
    }

    return { ok: true, message: `Connected. workspaces query returned ${data.length} row(s).` }
  } catch (err) {
    return { ok: false, message: `Unexpected error: ${String(err)}` }
  }
}
