import os
import time

import psycopg2


COLUMNS = [
    "business_status",
    "closure_date",
    "detail_status",
    "hygiene_industry",
    "industry",
    "license_date",
    "local_address",
    "management_number",
    "name",
    "phone",
    "road_address",
    "service_id",
    "service_name",
    "source_file",
]


def main():
    connection = psycopg2.connect(
        host=os.environ.get("DB_HOST", "albasave-db.c5csm4aeqbg6.ap-northeast-2.rds.amazonaws.com"),
        port=int(os.environ.get("DB_PORT", "5432")),
        dbname=os.environ.get("DB_NAME", "albasave"),
        user=os.environ["DB_USERNAME"],
        password=os.environ["DB_PASSWORD"],
    )
    start = time.time()
    columns_sql = ", ".join(COLUMNS)

    with connection.cursor() as cursor:
        cursor.execute("SET statement_timeout = 0")
        cursor.execute("TRUNCATE TABLE businesses RESTART IDENTITY")
        print("target_truncate_queued=true", flush=True)

        cursor.execute(
            f"""
            INSERT INTO businesses ({columns_sql})
            SELECT {columns_sql}
            FROM businesses_import
            WHERE source_file <> '' AND management_number <> '' AND name <> ''
            ON CONFLICT (source_file, management_number) DO NOTHING
            """
        )
        inserted = cursor.rowcount
        connection.commit()
        print(f"inserted={inserted}", flush=True)

        cursor.execute("SELECT count(*) FROM businesses")
        db_count = cursor.fetchone()[0]

    elapsed = time.time() - start
    print(f"DONE db_count={db_count} elapsed_sec={elapsed:.1f}", flush=True)
    connection.close()


if __name__ == "__main__":
    main()
