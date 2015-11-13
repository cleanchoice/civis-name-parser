civis-name-parser
=================


# Setup

This expects a destination table in the form of:

```sql
create table schema.parsed_names (
  query_job_id int not null,
  source_id int not null,
  full_name varchar(100),
  title varchar(10),
  first_name varchar(25),
  middle_name varchar(25),
  last_name varchar(30),
  suffix varchar(10),
  parsed_on timestamp default sysdate,
  primary key(query_job_id, source_id)
)
distkey(query_job_id)
compound sortkey(query_job_id, source_id);
```

To summarize results:

```sql
select query_job_id, count(1) , max(parsed_on)
from schema.parsed_names
group by query_job_id
order by max(parsed_on) desc
```


## Run in Docker

This as closely as possible mimics a standard Civis Custom Script configuration:

```bash
$ docker run -i -t --rm \
  -e "CIVIS_API_KEY=YOURapiKEYhere" -v $(pwd):/app -v /tmp:/data -w /app \
  --name civis-name-parser -m 512M node:5.0.0 \
  bash /app/run_script.sh  tableSchemaAndName idColumn nameColumn bucketName
```

# TODO

* Inspect tables for data types
* Add a setup command that:
  * Creates the destination table
  * Loads S3 credentials to Civis
  * Creates Custom Script

