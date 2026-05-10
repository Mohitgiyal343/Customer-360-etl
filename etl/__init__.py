"""
etl/__init__.py
===============
ETL package initialiser — exposes core pipeline functions.
"""

from etl.extract import extract_all
from etl.transform import transform_all
from etl.load import load_all

__all__ = ["extract_all", "transform_all", "load_all"]
