import os
import sys
import subprocess
import argparse
from dotenv import load_dotenv


def run_psql_command(commands: list[str], check=True, connect_to_db=False):
    """A helper function to run commands using the psql CLI."""
    # Base command connects to the postgres server, not a specific DB
    # This is required for creating/dropping databases.
    psql_cmd = [
        "psql",
        "-U",
        os.environ["DB_USER"],
        "-h",
        os.environ["DB_HOST"],
        "-p",
        os.environ["DB_PORT"],
    ]

    # For some commands, we need to connect to our specific database
    if connect_to_db:
        psql_cmd.extend(["-d", os.environ["DB_NAME"]])

    # Add the specific commands to execute
    for command in commands:
        psql_cmd.extend(["-c", command])

    # Set the password environment variable for non-interactive login
    env = os.environ.copy()
    env["PGPASSWORD"] = os.environ["DB_PASSWORD"]

    # Execute the command
    subprocess.run(psql_cmd, env=env, check=check)


def main():
    # --- Setup ---
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    load_dotenv(os.path.join(project_root, ".env"))
    sys.path.insert(0, os.path.join(project_root, "packages", "python", "src"))
    service_path = os.path.join(project_root, "apps", "user-profile-service")

    # --- Argument Parsing ---
    parser = argparse.ArgumentParser(description="Streamtario Database Management CLI")
    subparsers = parser.add_subparsers(dest="command", required=True)

    subparsers.add_parser("create", help="Create the PostgreSQL database.")
    subparsers.add_parser("drop", help="DANGER: Drop the PostgreSQL database.")
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
                f"DANGER ZONE: You are about to permanently delete the database '{os.environ['DB_NAME']}' and all its data."
            )
            confirm = input("To confirm, type the database name: ")
            if confirm != os.environ["DB_NAME"]:
                print("Confirmation failed. Aborting.")
                return
            print("Confirmation successful. Dropping database...")
            # Use FORCE to disconnect any active users (like our running services)
            run_psql_command([f"DROP DATABASE {os.environ['DB_NAME']} WITH (FORCE)"])
            print("Database dropped successfully.")

        elif args.command == "generate":
            alembic_cmd = [
                sys.executable,
                "-m",
                "alembic",
                "revision",
                "--autogenerate",
                "-m",
                args.message,
            ]
            print(f"Generating new migration with message: '{args.message}'...")
            subprocess.run(alembic_cmd, cwd=service_path, check=True)

        elif args.command == "upgrade":
            alembic_cmd = [sys.executable, "-m", "alembic", "upgrade", args.revision]
            print(f"Applying migrations to '{args.revision}'...")
            subprocess.run(alembic_cmd, cwd=service_path, check=True)

    except (subprocess.CalledProcessError, FileNotFoundError) as e:
        if isinstance(e, FileNotFoundError):
            print("\n---")
            print("FATAL ERROR: The 'psql' command was not found.")
            print(
                "Please ensure PostgreSQL client tools are installed and in your system's PATH."
            )
            print("---")
        else:
            print(f"\n--- An error occurred: {e} ---")
        sys.exit(1)


if __name__ == "__main__":
    main()
