<?php
/**
 * @copyright 2009-2017 Vanilla Forums Inc.
 * @license MIT
 */


if (!function_exists('valr')) {
    /**
     * Return the value from an associative array or an object.
     *
     * This function differs from getValue() in that $Key can be a string consisting of dot notation that will be used
     * to recursively traverse the collection.
     * Taken from https://github.com/vanilla/vanilla/blob/master/library/core/functions.compatibility.php#L434
     *
     * @param string $key The key or property name of the value.
     * @param mixed $collection The array or object to search.
     * @param mixed $default The value to return if the key does not exist.
     * @return mixed The value from the array or object.
     */
    function valr($key, $collection, $default = false) {
        $path = explode('.', $key);

        $value = $collection;
        for ($i = 0; $i < count($path); ++$i) {
            $subKey = $path[$i];

            if (is_array($value) && isset($value[$subKey])) {
                $value = $value[$subKey];
            } elseif (is_object($value) && isset($value->$subKey)) {
                $value = $value->$subKey;
            } else {
                return $default;
            }
        }
        return $value;
    }
}
