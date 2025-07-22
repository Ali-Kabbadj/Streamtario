import os
import sys
import subprocess
import argparse
from dotenv import load_dotenv
import shutil


def _clear_migrations_folder(versions_path: str):
    """Deletes all files within the alembic versions folder."""
    if not os.path.exists(versions_path) or not os.path.isdir(versions_path):
        print(f"Warning: Migrations versions folder not found at '{versions_path}'.")
        return

    print("Clearing old migration files...")
    for filename in os.listdir(versions_path):
        # We only want to delete the .py files, not .gitkeep or subdirectories
        if filename.endswith(".py"):
            file_path = os.path.join(versions_path, filename)
            try:
                os.unlink(file_path)
                print(f"  - Deleted {filename}")
            except Exception as e:
                print(f"Error deleting {file_path}: {e}")


def run_psql_command(commands: list[str], check=True, connect_to_db=False):
    """A helper function to run commands using the psql CLI."""
    psql_cmd = [
        "psql",
        "-U",
        os.environ["DB_USER"],
        "-h",
        os.environ["DB_HOST"],
        "-p",
        os.environ["DB_PORT"],
    ]
    if connect_to_db:
        psql_cmd.extend(["-d", os.environ["DB_NAME"]])
    for command in commands:
        psql_cmd.extend(["-c", command])
    env = os.environ.copy()
    env["PGPASSWORD"] = os.environ["DB_PASSWORD"]
    subprocess.run(psql_cmd, env=env, check=check, capture_output=True)


def main():
    # --- Setup ---
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    load_dotenv(os.path.join(project_root, ".env"))
    sys.path.insert(0, os.path.join(project_root, "packages", "python", "src"))

    # --- THE FIX: Point to the new centralized migrations directory ---
    migrations_path = os.path.join(project_root, "database", "migrations")
    versions_path = os.path.join(migrations_path, "alembic", "versions")

    # --- Argument Parsing ---
    parser = argparse.ArgumentParser(description="Streamtario Database Management CLI")
    subparsers = parser.add_subparsers(dest="command", required=True)

    subparsers.add_parser("create", help="Create the PostgreSQL database.")
    drop_parser = subparsers.add_parser(
        "drop", help="DANGER: Drop the database and clear all migration files."
    )

    parser_generate = subparsers.add_parser(
        "generate", help="Generate a new Alembic migration."
    )
    parser_generate.add_argument(
        "-m", "--message", type=str, required=True, help="Message for the migration."
    )

    parser_upgrade = subparsers.add_parser(
        "upgrade", help="Apply migrations to the database."
    )
    parser_upgrade.add_argument(
        "revision",
        type=str,
        nargs="?",
        default="head",
        help="The revision to upgrade to (default: head).",
    )

    args = parser.parse_args()

    # --- Command Execution ---
    try:
        if args.command == "create":
            print(f"Attempting to create database '{os.environ['DB_NAME']}'...")
            run_psql_command([f"CREATE DATABASE {os.environ['DB_NAME']}"])
            print("Database created successfully (or already existed).")

        elif args.command == "drop":
            print(
                f"DANGER ZONE: This will permanently delete the database '{os.environ['DB_NAME']}' AND all migration history."
            )
            confirm = input("To confirm, type the database name: ")
            if confirm != os.environ["DB_NAME"]:
                print("Confirmation failed. Aborting.")
                return
            print("Confirmation successful. Dropping database...")
            run_psql_command([f"DROP DATABASE {os.environ['DB_NAME']} WITH (FORCE)"])
            print("Database dropped successfully.")

            _clear_migrations_folder(versions_path)
            print("Development migration history has been cleared.")

        elif args.command == "generate":
            alembic_cmd = ["alembic", "revision", "--autogenerate", "-m", args.message]
            print(f"Generating new migration with message: '{args.message}'...")
            subprocess.run(
                alembic_cmd,
                cwd=migrations_path,
                check=True,
                capture_output=True,
                text=True,
            )
            print("Migration generated successfully.")

        elif args.command == "upgrade":
            alembic_cmd = ["alembic", "upgrade", args.revision]
            print(f"Applying migrations to '{args.revision}'...")
            subprocess.run(alembic_cmd, cwd=migrations_path, check=True)
            print("Migrations applied successfully.")

    except subprocess.CalledProcessError as e:
        print("\n" + "=" * 80)
        print(" FATAL: A command failed to execute ".center(80, "="))
        print("=" * 80)
        print(f"> Command: {' '.join(e.cmd)}")
        print(f"> Return Code: {e.returncode}")
        print("\n--- STDOUT ---")
        print(e.stdout or " (No stdout)")
        print("\n--- STDERR ---")
        print(e.stderr or " (No stderr)")
        print("=" * 80)
        print("Execution halted.")
        sys.exit(1)

    except FileNotFoundError:
        print("\nFATAL ERROR: The 'psql' or 'alembic' command was not found.")
        print(
            "Please ensure PostgreSQL client tools and alembic are installed in your venv and in your system's PATH."
        )
        sys.exit(1)


if __name__ == "__main__":
    main()
