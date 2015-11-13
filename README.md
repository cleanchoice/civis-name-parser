civis-name-parser
=================

`civis-name-parser` is a Node.js command line app that is designed to be used in conjunction
with the [Civis](https://github.com/civisanalytics) Platform. It can be used to efficiently
parse full names in to constituent parts using the [another-name-parser](https://www.npmjs.com/package/another-name-parser)
package. (Details on the specifics of name parsing can be found in the package's listing.)

Given a table with a unique identifier and a full name column, the app exports the
identifier and full name columns to an S3 bucket, streams the export--parsing names
along the way--and imports the result in to a common table: `parsed_names` which is
keyed off of the input's unique identifier and the ID of the first query job created
via the Civis API.

## Pre-Requisites

* A Civis Platform API key
* Node.js v4+
* An Amazon Web Services S3 Credential loaded in to the Civis platform
* A bucket readable and writeable by the loaded S3 credential


## Install

```bash
$ npm install
```

Then, create the following table in a schema of your choice:

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


## Usage

If running locally, call `npm start` for usage instructions.

If running as a Civis Custom Script, use the following settings:

| Setting | Value |
|---------|-----------|
| Git Repo URL | `github.com/ethicalelectric/civis-name-parser.git` |
| Git Repo Reference | `master` |
| Docker Image Name | `node:5.0.0` |
| Command | `bash /app/run_script.sh some_schema.names_to_parse name_of_unique_id_column name_of_full_name_column name-of-accessible-bucket` |
| Memory Usage | *Standard* |
| Credential | *none needed* |


After you've run the job, you can inspect the results of this job (and all others stored in the `parsed_names` table) using:

```sql
select query_job_id, count(1) , max(parsed_on)
from some_schema.parsed_names
group by query_job_id
order by max(parsed_on) desc
```

To load the parsed data back in to your source table (assuming it has the appropriate columns), use a
query similar to:

```sql
UPDATE some_schema.names_to_parse
SET title=p.title, first_name=p.first_name, middle_name=p.middle_name, last_name=p.last_name, suffix=p.suffix
FROM some_schema.names_to_parse s
JOIN some_schema.parsed_names p ON p.source_id=s.id AND p.query_job_id=1234
```



## Run in Docker

If you'd like to simulate a Civis Custom Script, use this `docker run` command; it
closely as possible mimics a standard Civis Custom Script configuration:

```bash
$ docker run -i -t --rm \
  -e "CIVIS_API_KEY=YOURapiKEYhere" -v $(pwd):/app -v /tmp:/data -w /app \
  --name civis-name-parser -m 512M node:5.0.0 \
  bash /app/run_script.sh  tableSchemaAndName idColumn nameColumn bucketName
```

## TODO

* Inspect tables for data types
* Add a setup command that:
  * Creates the destination table
  * Loads S3 credentials to Civis
  * Creates Custom Script

