import { BigQuery } from '@google-cloud/bigquery'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') })

const bq = new BigQuery({
  projectId: process.env.GCP_PROJECT_ID,
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
})

const DATASET = process.env.BIGQUERY_DATASET ?? 'tree_census'
const OBSERVATIONS_FQN = `${process.env.GCP_PROJECT_ID}.${DATASET}.observations`

async function main() {
  console.log(`Querying frequency distribution from ${OBSERVATIONS_FQN}...`)
  
  const query = `
    WITH stem_counts AS (
      SELECT
        plot_id,
        iucn_code,
        COUNT(DISTINCT tree_id) AS stems_in_plot
      FROM \`${OBSERVATIONS_FQN}\`
      WHERE observation_type = 'tree_stem' AND NULLIF(iucn_code, '') IS NOT NULL
      GROUP BY plot_id, iucn_code
    )
    SELECT
      iucn_code,
      stems_in_plot,
      COUNT(DISTINCT plot_id) AS plot_count
    FROM stem_counts
    GROUP BY iucn_code, stems_in_plot
    ORDER BY iucn_code, stems_in_plot
  `

  try {
    const [rows] = await bq.query({ query })
    console.log('\n--- IUCN Stem Frequency Distribution ---')
    console.table(rows)
  } catch (error) {
    console.error('Error running query:', error)
  }
}

main()
