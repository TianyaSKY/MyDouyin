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
        print("✓ Connected to Milvus successfully")
    except Exception as e:
        print(f"✗ Failed to connect to Milvus: {e}")
        return

    # 创建视频向量 Collection
    create_video_collection()
    
    # 创建用户向量 Collection
    create_user_collection()
    
    print("\n✓ All collections initialized successfully!")


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
            description="视频ID (主键)",
        ),
        FieldSchema(
            name="embedding",
            dtype=DataType.FLOAT_VECTOR,
            dim=DIM,
            description="视频向量 (128维)",
        ),
        FieldSchema(
            name="author_id",
            dtype=DataType.INT64,
            description="作者ID",
        ),
        FieldSchema(
            name="created_ts",
            dtype=DataType.INT64,
            description="创建时间戳 (毫秒)",
        ),
    ]

    schema = CollectionSchema(fields=fields, description="视频向量存储")

    # Create Collection
    collection = Collection(name=collection_name, schema=schema)
    print(f"  ✓ Collection '{collection_name}' created")

    # Create Index
    print("  Creating index...")
    index_params = {
        "metric_type": "COSINE",  # 余弦相似度
        "index_type": "HNSW",     # HNSW 索引，查询速度快
        "params": {"M": 16, "efConstruction": 200},
    }
    collection.create_index(field_name="embedding", index_params=index_params)
    print(f"  ✓ Index created: {index_params['index_type']} (metric: {index_params['metric_type']})")

    # Load collection
    collection.load()
    print(f"  ✓ Collection loaded into memory")


def create_user_collection():
    """创建用户向量 Collection"""
    collection_name = "user_vectors"
    
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
            description="用户ID (主键)",
        ),
        FieldSchema(
            name="long_term_vec",
            dtype=DataType.FLOAT_VECTOR,
            dim=DIM,
            description="长期兴趣向量 (128维)",
        ),
        FieldSchema(
            name="interest_vec",
            dtype=DataType.FLOAT_VECTOR,
            dim=DIM,
            description="初始兴趣向量 (128维，基于注册标签)",
        ),
        FieldSchema(
            name="updated_at",
            dtype=DataType.INT64,
            description="更新时间戳 (毫秒)",
        ),
    ]

    schema = CollectionSchema(fields=fields, description="用户向量存储")

    # Create Collection
    collection = Collection(name=collection_name, schema=schema)
    print(f"  ✓ Collection '{collection_name}' created")

    # Create Index for long_term_vec
    print("  Creating index on 'long_term_vec'...")
    index_params_long = {
        "metric_type": "COSINE",
        "index_type": "IVF_FLAT",
        "params": {"nlist": 1024},
    }
    collection.create_index(field_name="long_term_vec", index_params=index_params_long)
    print(f"  ✓ Index created on 'long_term_vec'")

    # Create Index for interest_vec
    print("  Creating index on 'interest_vec'...")
    index_params_interest = {
        "metric_type": "COSINE",
        "index_type": "IVF_FLAT",
        "params": {"nlist": 1024},
    }
    collection.create_index(field_name="interest_vec", index_params=index_params_interest)
    print(f"  ✓ Index created on 'interest_vec'")

    # Load collection
    collection.load()
    print(f"  ✓ Collection loaded into memory")


if __name__ == "__main__":
    init_milvus()
