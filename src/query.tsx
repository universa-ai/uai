import { Database } from "bun:sqlite";
import * as sqliteVec from "sqlite-vec";
import os from "os";
import { join } from "path";
import { default as executePrompt, jsxToJson } from "./uai.ts";
import ShortUniqueId from 'short-unique-id';

const { randomUUID } = new ShortUniqueId({ length: 10, dictionary: 'alphanum_lower' });

if (os.platform() === "darwin") {
    Database.setCustomSQLite("/opt/homebrew/Cellar/sqlite/3.47.0/lib/libsqlite3.0.dylib");
}

const db = new Database(join(import.meta.dir, '../', `${process.env.UAI_DB_NAME ?? 'db'}.sqlite`));

sqliteVec.load(db);

const { vec_version } = db
    .prepare("select vec_version() as vec_version;")
    .get();

console.log(`vec_version=${vec_version}`);

if (os.platform() === "darwin") {
    db.loadExtension(join(import.meta.dir, "../rembed0.dylib"));
} else {
    db.loadExtension(join(import.meta.dir, "../rembed0.so"));
}

db.query(`
  CREATE VIRTUAL TABLE IF NOT EXISTS vec_uai USING vec0(
    qa_id TEXT PRIMARY KEY,

    content_embedding FLOAT[1536],

    partition_key TEXT partition key,

    +from_data TEXT,
    +to_data TEXT
  );
`).run();

db.query('insert into temp.rembed_clients(name, options) values("text-embedding-3-small", "openai")').run();

interface MetadataOptions {
    qaId?: string;
    partitionKey?: string;
}

class Query {
    private currentQuery: { [key: string]: any };
    private model;

    constructor(query: { [key: string]: any }, model?: string | undefined) {
        this.currentQuery = query;
        this.model = model;
    }

    async infer(toFields: { [key: string]: any }, embeddingKey?: string | undefined) {
        const createXmlTags = (obj: any): JSX.Element[] => {
            return Object.entries(obj).filter(it => it[0] && it[1]).map(([key, value]) => {
                const TagName = key;
                // console.log("TagName ==> ", TagName, value);
                if (typeof value === 'object' && value !== null) {
                    return <TagName>{createXmlTags(value)}</TagName>;
                }
                return <TagName>{value}</TagName>;
            });
        };

        const tagsOfFromFields = createXmlTags(this.currentQuery);
        const tagsOfToFields = createXmlTags(toFields);

        const prompt = <>
            <settings temperature={0.0} enablesPrediction={false} model={this.model} />
            <system>
                <responseFormat>
                    <thinking>THINK carefully before responding, and write down your reasoning.</thinking>
                    {tagsOfToFields}
                </responseFormat>
            </system>
            <user>
                <context>
                    {tagsOfFromFields}
                </context>
            </user>
        </>;
        console.log("prompt ==> ", prompt);

        const result = await executePrompt(prompt);
        // console.log("infer result ==> ", result);

        return result;
    }
    
    private jsonToXml(obj: any, rootTag: string = 'root'): string {
        const convertToXml = (data: any): string => {
            if (typeof data !== 'object' || data === null) {
                return String(data);
            }

            return Object.entries(data).map(([key, value]) => {
                if (Array.isArray(value)) {
                    return value.map(item => `<${key}>${convertToXml(item)}</${key}>`).join('');
                }
                if (typeof value === 'object' && value !== null) {
                    return `<${key}>${convertToXml(value)}</${key}>`;
                }
                return `<${key}>${convertToXml(value)}</${key}>`;
            }).join('');
        };

        return `<${rootTag}>${convertToXml(obj)}</${rootTag}>`;
    }

    async embedHypothetical(data: { [key: string]: any }, metadata: MetadataOptions = {}, skipInPrompt: { [key: string]: boolean } = {}) {
        if (metadata.qaId) {
            let rowExists = db.query("SELECT 1 FROM vec_uai WHERE qa_id = $qaId").get({ $qaId: metadata.qaId });
            // console.log("rowExists ==> ", rowExists);
            if (rowExists) {
                return;
            }
        }

        // console.log("skipInPrompt ==> ", skipInPrompt);

        const embeddingData: { [key: string]: string } = {};
        for (const it in this.currentQuery) {
            if (!skipInPrompt[it]) {
                embeddingData[it] = this.currentQuery[it];
            }
        }
        // console.log("embeddingData ==> ", embeddingData);

        const hypotheticalQuery = new Query(embeddingData);
        const inferResponse: typeof data = await hypotheticalQuery.infer(data);
        console.log("inferResponse ==> ", inferResponse);

        const inferredFields: { [key: string]: string } = {};
        for (const it in data) {
            inferredFields[it] = inferResponse[it]?.trim().replaceAll('\n', '');
        }

        const finalQuery = new Query(inferredFields);

        const result = await finalQuery.reinforce(this.currentQuery, metadata);
        // console.log("result ==> ", result);

        return result;
    }

    private async insertVectorData(fromData: string, toData: string, partitionKey: string, qaId?: string) {
        const id = qaId || randomUUID();

        const params = {
            $qaId: id,
            $value: fromData,
            $partitionKey: partitionKey,
            $fromData: fromData,
            $toData: toData
        }
        // console.log("params ==> ", params);

        let rowExists = db.query("SELECT 1 FROM vec_uai WHERE qa_id = $qaId").get({ $qaId: id });
        // console.log("rowExists ==> ", rowExists);
        if (rowExists) {
        } else {
            db.query(`
    INSERT INTO vec_uai(
      qa_id,
      content_embedding,
      partition_key,
      from_data,
      to_data
    ) VALUES (
      $qaId,
      rembed("text-embedding-3-small", $value),
      $partitionKey,
      $fromData,
      $toData
    );
  `).run(params);
        }
    }

    async reinforce(additionalData: { [key: string]: any }, metadata: MetadataOptions = {}) {
        try {
            const { qaId, partitionKey = 'default' } = metadata;
            const toData = this.jsonToXml(additionalData);
            // console.log("toData ==> ", toData);
            const fromData = this.jsonToXml(this.currentQuery);
            // console.log("fromData ==> ", fromData);

            await this.insertVectorData(fromData, toData, partitionKey, qaId);
            // await this.insertVectorData(toData, fromData, `${partitionKey}_reverse`, qaId);

            return { success: true, message: "Data reinforced successfully" };
        } catch (error) {
            console.error("Error in reinforce:", error);
            return { success: false, message: error.message };
        }
    }

    recall(filters: { [key: string]: any } = {}) {
        const fromData = this.jsonToXml(this.currentQuery);
        console.log("fromData ==> ", fromData);

        let query = `
            SELECT 
                qa_id,
                from_data,
                to_data,
                distance
            FROM vec_uai 
            WHERE content_embedding MATCH rembed("text-embedding-3-small", $query)
        `;

        const params: { [key: string]: any } = {
            $query: fromData
        };

        let k = filters.limit || 1;
        console.log("k ==> ", k);

        Object.entries(filters).filter(it => it[0] != 'limit').forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                if (typeof key == 'string' && typeof value == 'string') {
                query += ` AND ${key} = $${key}`;
                params[`$${key}`] = value;
                } else if (typeof value == 'object' && value.not instanceof Array) {
                    for (let i = 0; i < value.not.length; i++) {
                        if (typeof value.not[i] == 'string') {
                            query += ` AND ${key} != $${key}${i} `;
                            params[`$${key}${i}`] = value.not[i];
                            // k++; // we increase number of top matches by one because we skill this one
                        }
                    }
                    // k = 20;
                }
            }
        });

        query += ` AND k = ${k} ORDER BY distance ASC`;
        
        console.log("query ==> ", query);
        console.log("params ==> ", params);

        const result = db.query(query).all(params);

        // result.reverse(); dont need to reverse, the lower the distance the higehr similarity is

        console.log("Recalling data with query:", fromData, "results:", result);

        const structuredResponse = result?.length > 0 ? result.map(it => {
            const json = jsxToJson(it.to_data);
            // console.log("json ==> ", json);
            return json;
        }) : [];

        return structuredResponse;
    }
}

export default {
    from(query: { [key: string]: any }, model?: string | undefined) {
        return new Query(query, model);
    }
};