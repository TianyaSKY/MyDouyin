import os
from pathlib import Path

from pymilvus import (
    connections,
    FieldSchema,
    CollectionSchema,
    DataType,
    Collection,
    utility,
)


def load_root_env() -> None:
    """加载项目根目录 .env 到进程环境变量（仅填充未设置项）。"""
    env_path = Path(__file__).resolve().parents[1] / ".env"
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key:
            os.environ.setdefault(key, value)


load_root_env()

# Configuration
MILVUS_HOST = os.getenv("MILVUS_HOST", "localhost")
MILVUS_PORT = os.getenv("MILVUS_PORT", "19530")
DIM = 1024  # 向量维度


def init_milvus():
    """初始化 Milvus 数据库，创建视频和用户向量 Collection"""
    print(f"Connecting to Milvus at {MILVUS_HOST}:{MILVUS_PORT}...")
    try:
        connections.connect("default", host=MILVUS_HOST, port=MILVUS_PORT)
        print("Connected to Milvus successfully")
    except Exception as e:
        print(f"Failed to connect to Milvus: {e}")
        return

    # 创建视频向量 Collection
    create_video_collection()

    # 创建用户向量 Collection
    create_user_collection()

    print("\nAll collections initialized successfully!")


def create_video_collection():
    """创建视频向量 Collection"""
    collection_name = "video_embedding"

    if utility.has_collection(collection_name):
        print(f"\n'{collection_name}' already exists, skipping...")
        return

    print(f"\nCreating collection '{collection_name}'...")

    # Define Schema
    fields = [
        FieldSchema(
            name="video_id",
            dtype=DataType.INT64,
            is_primary=True,
            description="Video ID",
        ),
        FieldSchema(
            name="embedding",
            dtype=DataType.FLOAT_VECTOR,
            dim=DIM,
            description="Video vector (1024d)",
        ),
        FieldSchema(
            name="author_id",
            dtype=DataType.INT64,
            description="Author ID",
        ),
        FieldSchema(
            name="created_ts",
            dtype=DataType.INT64,
            description="Created timestamp",
        ),
    ]

    schema = CollectionSchema(fields=fields, description="Video embedding storage")

    # Create Collection
    collection = Collection(name=collection_name, schema=schema)
    print(f"Collection '{collection_name}' created")

    # Create Index
    print("Creating index...")
    index_params = {
        "metric_type": "COSINE",
        "index_type": "HNSW",
        "params": {"M": 16, "efConstruction": 200},
    }
    collection.create_index(field_name="embedding", index_params=index_params)
    print(
        f"Index created: {index_params['index_type']} (metric: {index_params['metric_type']})"
    )

    # Load collection
    collection.load()
    print(f"Collection loaded into memory")


def create_user_collection():
    """创建用户向量 Collection"""
    # 拆分为两个 Collection，因为某些 Milvus 版本不支持多向量字段
    create_single_user_vector_collection(
        "user_long_term_vectors", "Long-term interest storage"
    )
    create_single_user_vector_collection(
        "user_interest_vectors", "Initial interest storage"
    )


def create_single_user_vector_collection(collection_name, description):
    """创建一个单向量的用户集合"""
    if utility.has_collection(collection_name):
        print(f"\n'{collection_name}' already exists, skipping...")
        return

    print(f"\nCreating collection '{collection_name}'...")

    # Define Schema
    fields = [
        FieldSchema(
            name="user_id",
            dtype=DataType.INT64,
            is_primary=True,
            description="User ID",
        ),
        FieldSchema(
            name="vector",
            dtype=DataType.FLOAT_VECTOR,
            dim=DIM,
            description="User vector (1024d)",
        ),
        FieldSchema(
            name="updated_at",
            dtype=DataType.INT64,
            description="Updated timestamp",
        ),
    ]

    schema = CollectionSchema(fields=fields, description=description)

    # Create Collection
    collection = Collection(name=collection_name, schema=schema)
    print(f"Collection '{collection_name}' created")

    # Create Index
    print(f"Creating index on 'vector' for {collection_name}...")
    index_params = {
        "metric_type": "COSINE",
        "index_type": "IVF_FLAT",
        "params": {"nlist": 1024},
    }
    collection.create_index(field_name="vector", index_params=index_params)
    print(f"Index created on 'vector'")

    # Load collection
    collection.load()
    print(f"Collection loaded into memory")


if __name__ == "__main__":
    init_milvus()
