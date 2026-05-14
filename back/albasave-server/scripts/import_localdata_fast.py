import csv
import glob
import io
import os
import time

import psycopg2

DATA_DIR = os.environ.get("LOCALDATA_CSV_DIR", "/home/ubuntu/albasave-data")
BATCH_SIZE = int(os.environ.get("IMPORT_BATCH_SIZE", "20000"))

HEADERS = {
    "name": "\uc0ac\uc5c5\uc7a5\uba85",
    "management_number": "\uad00\ub9ac\ubc88\ud638",
    "local_address": "\uc18c\uc7ac\uc9c0\uc804\uccb4\uc8fc\uc18c",
    "road_address": "\ub3c4\ub85c\uba85\uc804\uccb4\uc8fc\uc18c",
    "industry": "\uc5c5\ud0dc\uad6c\ubd84\uba85",
    "hygiene_industry": "\uc704\uc0dd\uc5c5\ud0dc\uba85",
    "business_status": "\uc601\uc5c5\uc0c1\ud0dc\uba85",
    "detail_status": "\uc0c1\uc138\uc601\uc5c5\uc0c1\ud0dc\uba85",
    "license_date": "\uc778\ud5c8\uac00\uc77c\uc790",
    "closure_date": "\ud3d0\uc5c5\uc77c\uc790",
    "phone": "\uc18c\uc7ac\uc9c0\uc804\ud654",
    "service_name": "\uac1c\ubc29\uc11c\ube44\uc2a4\uba85",
    "service_id": "\uac1c\ubc29\uc11c\ube44\uc2a4\uc544\uc774\ub514",
}

COPY_COLUMNS = [
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


def industry_from_file_name(path):
    name = os.path.basename(path)
    marker = "_P_"
    if marker not in name:
        return name.removesuffix(".csv")
    return name.split(marker, 1)[1].removesuffix(".csv")


def clean(value, limit=None):
    if value is None:
        return ""
    value = str(value).strip()
    value = value.encode("utf-8", "replace").decode("utf-8", "replace")
    if limit and len(value) > limit:
        return value[:limit]
    return value


def rows_from_file(path):
    source_file = os.path.basename(path)
    fallback_industry = industry_from_file_name(path)
    with open(path, encoding="cp949", errors="replace", newline="") as file:
        reader = csv.DictReader(file)
        for row in reader:
            name = clean(row.get(HEADERS["name"]), 300)
            management_number = clean(row.get(HEADERS["management_number"]), 80)
            if not name or not management_number:
                continue
            industry = clean(row.get(HEADERS["industry"]), 100) or clean(fallback_industry, 100)
            yield {
                "business_status": clean(row.get(HEADERS["business_status"]), 50),
                "closure_date": clean(row.get(HEADERS["closure_date"]), 20),
                "detail_status": clean(row.get(HEADERS["detail_status"]), 50),
                "hygiene_industry": clean(row.get(HEADERS["hygiene_industry"]), 100),
                "industry": industry,
                "license_date": clean(row.get(HEADERS["license_date"]), 20),
                "local_address": clean(row.get(HEADERS["local_address"]), 1000),
                "management_number": management_number,
                "name": name,
                "phone": clean(row.get(HEADERS["phone"]), 50),
                "road_address": clean(row.get(HEADERS["road_address"]), 1000),
                "service_id": clean(row.get(HEADERS["service_id"]), 30),
                "service_name": clean(row.get(HEADERS["service_name"]), 80),
                "source_file": clean(source_file, 100),
            }


def copy_batch(connection, batch):
    if not batch:
        return 0
    buffer = io.StringIO()
    writer = csv.writer(buffer, lineterminator="\n")
    for row in batch:
        writer.writerow([row[column] for column in COPY_COLUMNS])
    buffer.seek(0)
    columns_sql = ", ".join(COPY_COLUMNS)
    with connection.cursor() as cursor:
        try:
            cursor.copy_expert(f"COPY businesses_import ({columns_sql}) FROM STDIN WITH (FORMAT csv)", buffer)
            connection.commit()
        except Exception:
            connection.rollback()
            raise
    return len(batch)


def main():
    connection = psycopg2.connect(
        host=os.environ.get("DB_HOST", "albasave-db.c5csm4aeqbg6.ap-northeast-2.rds.amazonaws.com"),
        port=int(os.environ.get("DB_PORT", "5432")),
        dbname=os.environ.get("DB_NAME", "albasave"),
        user=os.environ["DB_USERNAME"],
        password=os.environ["DB_PASSWORD"],
    )
    start = time.time()
    files = sorted(glob.glob(os.path.join(DATA_DIR, "*.csv")))
    total = 0
    skipped_files = 0
    batch = []

    print(f"files={len(files)} data_dir={DATA_DIR}", flush=True)
    with connection.cursor() as cursor:
        cursor.execute("DROP TABLE IF EXISTS businesses_import")
        cursor.execute(
            """
            CREATE UNLOGGED TABLE businesses_import (
                business_status varchar(50),
                closure_date varchar(20),
                detail_status varchar(50),
                hygiene_industry varchar(100),
                industry varchar(100),
                license_date varchar(20),
                local_address varchar(1000),
                management_number varchar(80),
                name varchar(300) not null,
                phone varchar(50),
                road_address varchar(1000),
                service_id varchar(30),
                service_name varchar(80),
                source_file varchar(100)
            )
            """
        )
    connection.commit()

    for index, path in enumerate(files, 1):
        file_count = 0
        try:
            for row in rows_from_file(path):
                batch.append(row)
                file_count += 1
                if len(batch) >= BATCH_SIZE:
                    total += copy_batch(connection, batch)
                    batch.clear()
                    print(f"imported={total} current_file={index}/{len(files)}", flush=True)
        except Exception as exc:
            skipped_files += 1
            print(f"skipped_file={path} error={type(exc).__name__}: {exc}", flush=True)
        print(f"file_done={index}/{len(files)} rows={file_count} name={os.path.basename(path)}", flush=True)

    total += copy_batch(connection, batch)
    batch.clear()

    elapsed = time.time() - start
    print(f"DONE staged={total} skipped_files={skipped_files} elapsed_sec={elapsed:.1f}", flush=True)
    connection.close()


if __name__ == "__main__":
    main()
