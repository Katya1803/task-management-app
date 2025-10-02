package com.app.taskmanagement.utils;

import com.app.taskmanagement.constant.TimeConstants;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Date;


public final class DateTimeUtils {

    private DateTimeUtils() {}


    public static String format(LocalDateTime dateTime) {
        return dateTime.format(DateTimeFormatter.ofPattern(TimeConstants.DEFAULT_PATTERN));
    }

    public static LocalDateTime parse(String dateTimeStr) {
        return LocalDateTime.parse(dateTimeStr, DateTimeFormatter.ofPattern(TimeConstants.DEFAULT_PATTERN));
    }

    public static Date toDate(LocalDateTime dateTime) {
        return Date.from(dateTime.atZone(ZoneId.systemDefault()).toInstant());
    }

    public static LocalDateTime now() {
        return LocalDateTime.now(ZoneId.systemDefault());
    }
}
