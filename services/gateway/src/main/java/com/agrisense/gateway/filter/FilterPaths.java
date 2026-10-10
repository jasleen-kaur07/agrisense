package com.agrisense.gateway.filter;

/** Path helpers shared by filters. */
final class FilterPaths {
    private FilterPaths() {}

    /** Removes trailing slashes (gateway route predicates accept them) so exact comparisons are safe. */
    static String normalize(String path) {
        String p = path;
        while (p.length() > 1 && p.endsWith("/")) {
            p = p.substring(0, p.length() - 1);
        }
        return p;
    }
}
