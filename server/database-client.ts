import {PGlite} from '@electric-sql/pglite';
import pg from 'pg';
type Query={query<T=any>(text:string,params?:any[]):Promise<{rows:T[]}>};
export interface Database extends Query {exec(text:string):Promise<any>;transaction<T>(fn:(tx:Query)=>Promise<T>):Promise<T>;close():Promise<void>}
export function database(localPath:string):Database{
 if(!process.env.DATABASE_URL||process.env.TEST_DB)return new PGlite(localPath) as Database;
 const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,max:5});
 const query=async<T=any>(text:string,params:any[]=[])=>({rows:(await pool.query(text,params)).rows as T[]});
 return {query,exec:async text=>{await pool.query(text);},close:()=>pool.end(),transaction:async fn=>{
  const client=await pool.connect();try{await client.query('BEGIN');const result=await fn({query:async<T=any>(text:string,params:any[]=[])=>({rows:(await client.query(text,params)).rows as T[]})});await client.query('COMMIT');return result;}catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
 }};
}
