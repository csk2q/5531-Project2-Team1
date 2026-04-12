import datetime
import logging
import os
import sqlite3
import zipfile
from datetime import timezone
from pathlib import Path

from models import File

liveDbPath = Path("instance", "app.db")
backupFolder = Path("backups")

logger = logging.getLogger(__name__)


def backupSqlite() -> tuple[bool, Path | str]:
    curTimeStr = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%d_%H%M%S_%fZ")
    
    backupDbPath = Path(backupFolder, f'app-{curTimeStr}-temp.db')
    zipPath = Path(backupFolder, f"backup-{curTimeStr}.zip")

    if not os.path.exists(backupFolder):
        os.mkdir(backupFolder)

    # Connect to source database
    source_conn = sqlite3.connect(liveDbPath)
    # Connect to destination database
    dest_conn = sqlite3.connect(backupDbPath)

    try:
        # Perform the backup
        with dest_conn:
            source_conn.backup(dest_conn)
        logger.info(f"Sqlite Backup '{curTimeStr}' completed successfully!")

        filesCursor = dest_conn.cursor()
        filesCursor.execute("SELECT path FROM File;")
        filesPathsInBackup = filesCursor.fetchall()
        
    except sqlite3.Error as error:
        errMsg = f"Error while taking backup {curTimeStr}:"
        logger.error(errMsg, error)
        return False, errMsg
        
    finally:
        source_conn.close()
        dest_conn.close()

    # Zip file and db
    try:
        with zipfile.ZipFile(zipPath, "x") as zipFile:
            zipFile.write(backupDbPath, Path('instance', 'app.db'))
            for filePathStr in filesPathsInBackup:
                zipFile.write(filePathStr[0], Path('uploads', os.path.basename(filePathStr[0])))

        # Remove temporary db since it is in zip now.
        os.remove(backupDbPath)

    except Exception as error:
        errMsg = "Failed to zip up backup."
        logger.error("Backup failed. Zipping backup failed to zip backup", error)
        return False, errMsg

    return True, zipPath
    
def overwriteSqlite(sourceBackupPath: Path):
    dest_conn = sqlite3.connect(liveDbPath)
    source_conn = sqlite3.connect(f'file:{sourceBackupPath}?mode=ro', uri=True)
    try:

        destCursor = dest_conn.cursor()
        sourceCursor = source_conn.cursor()

        # Note: If the tables don't exist in the destination db an error will be thrown later.
        sourceCursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = [row[0] for row in sourceCursor.fetchall()]

        for table in tables:
            if table == 'sqlite_sequence':
                continue # Skip internal sequence table
            
            # Delete existing rows
            destCursor.execute(f'DELETE FROM {table}')
            
            sourceCursor.execute(f'SELECT * FROM {table}')
            rows = sourceCursor.fetchall()
            
            if rows:
                placeholders = ','.join(['?'] * len(rows[0]))
                destCursor.executemany(f'INSERT INTO {table} VALUES ({placeholders})', rows)
            else:
                print(f"Table {table} is empty in backup.")

        dest_conn.commit()
        logger.info(f"Database restored from {sourceBackupPath}.")

    except Exception as e:
        logger.error("Database restore failed.", e)
        dest_conn.rollback()
        raise
    finally:
        dest_conn.close()
        source_conn.close()
