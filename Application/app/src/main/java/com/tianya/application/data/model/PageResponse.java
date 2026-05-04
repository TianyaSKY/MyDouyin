package com.tianya.application.data.model;

import java.util.List;

/**
 * Paginated response wrapper matching backend IPage<T>.
 */
public class PageResponse<T> {
    private List<T> records;
    private long total;
    private long size;
    private long current;
    private long pages;

    public List<T> getRecords() { return records; }
    public void setRecords(List<T> records) { this.records = records; }

    public long getTotal() { return total; }
    public void setTotal(long total) { this.total = total; }

    public long getSize() { return size; }
    public void setSize(long size) { this.size = size; }

    public long getCurrent() { return current; }
    public void setCurrent(long current) { this.current = current; }

    public long getPages() { return pages; }
    public void setPages(long pages) { this.pages = pages; }
}
