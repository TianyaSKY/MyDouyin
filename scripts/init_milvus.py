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
COLLECTION_NAME = "video_embedding"
DIM = 128  # As requested (128/256)


def init_milvus():
    print(f"Connecting to Milvus at {MILVUS_HOST}:{MILVUS_PORT}...")
    try:
        connections.connect("default", host=MILVUS_HOST, port=MILVUS_PORT)
    except Exception as e:
        print(f"Failed to connect to Milvus: {e}")
        return

    if utility.has_collection(COLLECTION_NAME):
        print(f"Collection '{COLLECTION_NAME}' already exists.")
        return

    print(f"Creating collection '{COLLECTION_NAME}'...")

    # Define Schema
    fields = [
        FieldSchema(
            name="video_id",
            dtype=DataType.INT64,
            is_primary=True,
            description="Primary Key (Video ID)",
        ),
        FieldSchema(
            name="embedding",
            dtype=DataType.FLOAT_VECTOR,
            dim=DIM,
            description="Video Vector Embedding",
        ),
        # Scalar fields for filtering (Optional per MVP design)
        FieldSchema(
            name="author_id",
            dtype=DataType.INT64,
            description="Author ID",
        ),
        FieldSchema(
            name="created_ts",
            dtype=DataType.INT64,
            description="Timestamp for time filtering",
        ),
    ]

    schema = CollectionSchema(fields=fields, description="Douyin Video Embeddings")

    # Create Collection
    collection = Collection(name=COLLECTION_NAME, schema=schema)
    print(f"Collection '{COLLECTION_NAME}' created successfully.")

    # Create Index
    print("Creating index...")
    index_params = {
        "metric_type": "L2",  # or IP (Inner Product)
        "index_type": "HNSW",
        "params": {"M": 8, "efConstruction": 64},
    }
    collection.create_index(field_name="embedding", index_params=index_params)
    print(f"Index created on 'embedding' field: {index_params}")

    # Load collection (required for search)
    # collection.load()
    # print("Collection loaded into memory.")


if __name__ == "__main__":
    init_milvus()
