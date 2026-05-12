package com.tianya.application.ui.profile;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.bumptech.glide.Glide;
import com.tianya.application.R;
import com.tianya.application.data.model.Video;
import com.tianya.application.util.UrlUtils;

import java.util.ArrayList;
import java.util.List;

public class VideoGridAdapter extends RecyclerView.Adapter<VideoGridAdapter.GridViewHolder> {

    private final List<Video> videos = new ArrayList<>();
    private OnItemClickListener clickListener;
    private OnItemLongClickListener longClickListener;

    public interface OnItemClickListener {
        void onClick(Video video, int position);
    }

    public interface OnItemLongClickListener {
        void onLongClick(Video video, int position);
    }

    public void setOnItemClickListener(OnItemClickListener listener) {
        this.clickListener = listener;
    }

    public void setOnItemLongClickListener(OnItemLongClickListener listener) {
        this.longClickListener = listener;
    }

    public void setVideos(List<Video> newVideos) {
        videos.clear();
        if (newVideos != null) videos.addAll(newVideos);
        notifyDataSetChanged();
    }

    public void removeAt(int position) {
        if (position >= 0 && position < videos.size()) {
            videos.remove(position);
            notifyItemRemoved(position);
        }
    }

    @NonNull
    @Override
    public GridViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext())
                .inflate(R.layout.item_video_grid, parent, false);

        // Make items square based on 3-column grid
        int width = parent.getMeasuredWidth() / 3;
        view.getLayoutParams().height = (int) (width * 1.35);

        return new GridViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull GridViewHolder holder, int position) {
        Video video = videos.get(position);

        if (video.getCoverUrl() != null && !video.getCoverUrl().isEmpty()) {
            Glide.with(holder.itemView.getContext())
                    .load(UrlUtils.resolveUrl(video.getCoverUrl()))
                    .centerCrop()
                    .into(holder.ivCover);
        }

        holder.tvViewCount.setText(formatCount(video.getLikeCount()));

        holder.itemView.setOnClickListener(v -> {
            if (clickListener != null) clickListener.onClick(video, position);
        });

        holder.itemView.setOnLongClickListener(v -> {
            if (longClickListener != null) {
                longClickListener.onLongClick(video, position);
                return true;
            }
            return false;
        });
    }

    @Override
    public int getItemCount() { return videos.size(); }

    private String formatCount(Long count) {
        if (count == null) return "0";
        if (count >= 10000) return String.format("%.1fw", count / 10000.0);
        return String.valueOf(count);
    }

    static class GridViewHolder extends RecyclerView.ViewHolder {
        final ImageView ivCover;
        final TextView tvViewCount;

        GridViewHolder(@NonNull View itemView) {
            super(itemView);
            ivCover = itemView.findViewById(R.id.ivCover);
            tvViewCount = itemView.findViewById(R.id.tvViewCount);
        }
    }
}
