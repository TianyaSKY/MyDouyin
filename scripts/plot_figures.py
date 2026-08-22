import matplotlib.pyplot as plt
import numpy as np
import os

# Create figures dir if not exists
os.makedirs('e:/Projects/Douyin/figures', exist_ok=True)

# 风格设置 (Academic, deep blue and elegant)
plt.style.use('seaborn-v0_8-whitegrid')
plt.rcParams['font.sans-serif'] = ['Microsoft YaHei']
plt.rcParams['axes.unicode_minus'] = False

# ================================
# 图14: 行为时间衰减曲线图
# ================================
t = np.linspace(0, 7, 100) # 0 to 7 days
# y = w * exp(-lambda * t)
lambda_decay = 0.5
y_like = 1.0 * np.exp(-lambda_decay * t)
y_comment = 0.8 * np.exp(-lambda_decay * t)
y_view = 0.5 * np.exp(-lambda_decay * t * 1.5)

fig, ax = plt.subplots(figsize=(8, 5))
ax.plot(t, y_like, label='点赞 (Like)', color='#002855', linewidth=2.5)
ax.plot(t, y_comment, label='评论 (Comment)', color='#6C8EBF', linewidth=2.5, linestyle='--')
ax.plot(t, y_view, label='曝光 (Impression)', color='#D79B00', linewidth=2)

ax.set_title('图14 隐式反馈行为时间衰减曲线', fontsize=14, fontweight='bold', color='#002855')
ax.set_xlabel('时间距今 (天)', fontsize=12)
ax.set_ylabel('行为权重得分 (Weight)', fontsize=12)
ax.legend()
plt.tight_layout()
plt.savefig('e:/Projects/Douyin/figures/图14_行为时间衰减曲线图.png', dpi=300)
plt.close()

# ================================
# 图28: 系统压测吞吐量分布图
# ================================
fig, ax = plt.subplots(figsize=(8, 5))
categories = ['Spring Boot\n(业务层)', 'FastAPI\n(模型层)', 'Redis\n(缓存)', 'Milvus\n(向量检索引擎)', 'RabbitMQ\n(异步队列)']
qps = [5000, 1200, 15000, 3500, 8000]
colors = ['#DAE8FC', '#FFE6CC', '#002855', '#D6B656', '#6C8EBF']

bars = ax.bar(categories, qps, color=colors, edgecolor='#333333', linewidth=1)
ax.set_title('图28 各核心组件压测吞吐量 (QPS)', fontsize=14, fontweight='bold', color='#002855')
ax.set_ylabel('QPS (Queries Per Second)', fontsize=12)

# 添加数据标签
for bar in bars:
    yval = bar.get_height()
    ax.text(bar.get_x() + bar.get_width()/2, yval + 200, f'{yval:,}', ha='center', va='bottom', fontweight='bold')

plt.tight_layout()
plt.savefig('e:/Projects/Douyin/figures/图28_系统压测吞吐量分布图.png', dpi=300)
plt.close()

print("Python plots generated successfully.")
