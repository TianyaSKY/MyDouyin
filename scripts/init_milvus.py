from pymilvus import (
    connections,
    FieldSchema,
    CollectionSchema,
    DataType,
    Collection,
    utility,
)

# Configuration
MILVUS_HOST = "localhost"
MILVUS_PORT = "19530"
DIM = 128  # 向量维度


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
            description="Video vector (128d)",
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
            description="User vector (128d)",
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
